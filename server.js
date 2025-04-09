const express = require("express");
const cookieSession = require("cookie-session");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require('mysql2/promise');
const ExcelJS = require("exceljs");
const app = express();
app.use(cors());
const multer = require('multer');
const path = require('path');
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cookieSession({
    name: "bezkoder-session",
    keys: ["COOKIE_SECRET"],
    httpOnly: true,
    sameSite: "strict",
  })
);

// Sequelize Models
const db = require("./app/models");
const Role = db.role;
db.sequelize.sync();
app.use(express.urlencoded({ extended: true }));
app.use(
  cookieSession({
    name: "bezkoder-session",
    keys: ["COOKIE_SECRET"], // should use as secret environment variable
    httpOnly: true,
    sameSite: "strict",
  }),
);
app.use(cors());
const xlsx = require('xlsx');


// Set up multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });
// MySQL connection for custom queries
let db1;
(async () => {
  db1 = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root1",
    database: "ecommerce",
  });
  console.log("Connected to MySQL database");
})();

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Welcome to bezkoder application." });
});

require("./app/routes/auth.routes")(app);
require("./app/routes/user.routes")(app);

// Product listing with pagination, sorting, searching
app.get("/catgories", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const allowedSortFields = ["products.id", "products.name", "products.price", "categories.name"];
    const sortBy = allowedSortFields.includes(req.query.sortBy) ? req.query.sortBy : "products.id";
    const sortOrder = req.query.sort === "desc" ? "DESC" : "ASC";

    const search = req.query.search || "";
    const searchQuery = `%${search}%`;

    const [rows] = await db1.query(
      `SELECT products.*, categories.name AS category_name
       FROM products
       LEFT JOIN categories ON products.categoryId = categories.id
       WHERE products.name LIKE ? OR categories.name LIKE ?
       ORDER BY ${mysql.escapeId(sortBy)} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [searchQuery, searchQuery, limit, offset]
    );

    const [[{ count }]] = await db1.query(
      `SELECT COUNT(*) AS count
       FROM products
       LEFT JOIN categories ON products.categoryId = categories.id
       WHERE products.name LIKE ? OR categories.name LIKE ?`,
      [searchQuery, searchQuery]
    );

    res.json({
      data: rows,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Category CRUD
app.get("/api/catgories", async (req, res) => {
  try {
    const [rows] = await db1.query("SELECT * FROM categories");
    res.json(rows);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post("/api/categories", async (req, res) => {
  try {
    const { name   , price } = req.body;
    const [result] = await db1.query(
      "INSERT INTO categories (name , price ) VALUES (?, ?)",
      [name , price ]
    );
    res.status(201).json({ id: result.insertId, name, price });
  } catch (err) {
    res.status(500).send(err);
  }
});

app.put("/api/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price } = req.body;

    await db1.query(
      "UPDATE categories SET name = ?, price = ? WHERE id = ?",
      [name, price, id] // ✅ Corrected
    );

    res.json({ id, name, price });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).send(err);
  }
});


app.delete("/api/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db1.query("DELETE FROM categories WHERE id = ?", [id]);
    res.json({ message: `Category ${id} deleted` });
  } catch (err) {
    res.status(500).send(err);
  }
});

// Excel report download for products
app.get("/download-products-report", async (req, res) => {
  try {
    // Step 1: Fetch data from MySQL
    const [rows] = await db1.query(`
      SELECT * from Categories
    `);

    // Step 2: Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Catgories Report");

    // Step 3: Define columns
    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Price", key: "price", width: 15 },
      { header: "Category", key: "name", width: 25 },
    ];

    // Step 4: Add rows
    worksheet.addRows(rows);

    // Step 5: Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=products-report.xlsx"
    );

    // Step 6: Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(500).json({ error: "Failed to generate Excel report" });
  }
});


app.get("/download-catgories-report", async (req, res) => {
  try {
    // Step 1: Fetch product data with category name
    const [rows] = await db1.query(`
      select * from categories   `);

    // Step 2: Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Products Report");

    // Step 3: Define columns
    worksheet.columns = [
      { header: "name", key: "name", width: 30 },
      { header: "price", key: "price", width: 15 },
    ];

    // Step 4: Add rows
    worksheet.addRows(rows);

    // Step 5: Set headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=products-report.xlsx"
    );

    // Step 6: Write workbook to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel report:", error);
    res.status(500).json({ error: "Failed to generate Excel report" });
  }
});

app.get("/products", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Sorting
    const allowedSortFields = [
      "products.id",
      "ProductName",
      "price",
      "name",
    ];
    const sortBy = allowedSortFields.includes(req.query.sortBy)
      ? req.query.sortBy
      : "products.id";
    const sortOrder = req.query.sort === "desc" ? "DESC" : "ASC";

    // Search
    const search = req.query.search || "";
    const searchQuery = `%${search}%`;
    const sortClause = `${mysql.escapeId(sortBy)} ${sortOrder}`;

    // Main Query
    const [rows] = await db1.query(
      `
      SELECT 
  products.*, 
  categories.name AS category_name
FROM products
LEFT JOIN categories ON products.categoryId = categories.id
WHERE products.name LIKE ? OR categories.name LIKE ?
      ORDER BY ${sortClause}

LIMIT ? OFFSET ?
      `,
      [searchQuery, searchQuery, limit, offset],
    );

    // Count query
    const [[{ count }]] = await db1.query(
      `
    SELECT COUNT(*) AS count
FROM products
LEFT JOIN categories ON products.categoryId = categories.id
WHERE products.name LIKE ? OR categories.name LIKE ?

      `,
      [searchQuery, searchQuery],
    );

    res.json({
      data: rows,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post('/upload', upload.single('excelFile'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const workbook = xlsx.readFile(req.file.path);
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  // Example: insert into a table called 'products'
  data.forEach((row) => {
    console.log(row)
    const {name  , price } = row;
    const sql = 'INSERT INTO categories (name, price) VALUES (?, ?)';
    db1.query(sql, [name , price], (err) => {
      if (err) console.error('Insert error:', err);
    });
  });

  res.send('File uploaded and data saved!');
});



//Products
app.get("/api/products", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const sortBy = req.query.sortBy || "products.id";
    const sortOrder = req.query.sort === "desc" ? "DESC" : "ASC";
    const search = req.query.search || "";
    const searchQuery = `%${search}%`;

    const [rows] = await db1.query(`
      SELECT products.*, categories.name AS categoryName
      FROM products
      LEFT JOIN categories ON products.categoryId = categories.id
      WHERE products.name LIKE ? OR categories.name LIKE ?
      ORDER BY ${mysql.escapeId(sortBy)} ${sortOrder}
      LIMIT ? OFFSET ?
    `, [searchQuery, searchQuery, limit, offset]);

    const [[{ count }]] = await db1.query(`
      SELECT COUNT(*) as count
      FROM products
      LEFT JOIN categories ON products.categoryId = categories.id
      WHERE products.name LIKE ? OR categories.name LIKE ?
    `, [searchQuery, searchQuery]);

    res.json({
      data: rows,
      totalItems: count,
      currentPage: page,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/products", async (req, res) => {
  try {
    const {name, image, price, categoryId } = req.body;

    const [result] = await db1.query(
      `INSERT INTO products (name, image, price, categoryId) VALUES (?, ?, ?, ?)`,
      [name, image, price, categoryId]
    );

    res.status(201).json({ id: result.insertId, name, image, price, categoryId });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
});
app.put("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image, price, categoryId } = req.body;

    await db1.query(
      `UPDATE products SET  name = ?, image = ?, price = ?, categoryId = ? WHERE id = ?`,
      [name, image, price, categoryId, id]
    );

    res.json({name, image, price, categoryId });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
});
app.delete("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db1.query(`DELETE FROM products WHERE id = ?`, [id]);
    res.json({ message: `Product ${id} deleted successfully` });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});
app.post('/upload-products', upload.single('excelFile'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const workbook = xlsx.readFile(req.file.path);
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  for (const row of data) {
    const {Name, Image, Price, CategoryId } = row;

    await db1.query(
      'INSERT INTO products (uniqueId, name, image, price, categoryId) VALUES (?, ?, ?, ?, ?)',
      [Name, Image, Price, CategoryId]
    );
  }

  res.send('Products uploaded and saved!');
});



// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});