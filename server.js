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
app.get("/products", async (req, res) => {
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
    const [rows] = await db1.query("SELECT * FROM catgories");
    res.json(rows);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post("/api/categories", async (req, res) => {
  try {
    const { catgoriesName   , catgoriesPrice } = req.body;
    const [result] = await db1.query(
      "INSERT INTO catgories (catgoriesName , catgoriesPrice ) VALUES (?, ?)",
      [catgoriesName , catgoriesPrice ]
    );
    res.status(201).json({ id: result.insertId, catgoriesName, catgoriesPrice });
  } catch (err) {
    res.status(500).send(err);
  }
});

app.put("/api/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { catgoriesName, catgoriesPrice} = req.body;
    await db1.query(
"UPDATE catgories SET catgoriesName = ?, catgoriesPrice = ? WHERE id = ?"
      [catgoriesName, catgoriesPrice, id]
    );
    res.json({ id, catgoriesName, catgoriesPrice});
  } catch (err) {
    res.status(500).send(err);
  }
});

app.delete("/api/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db1.query("DELETE FROM catgories WHERE id = ?", [id]);
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
      SELECT * from Catgories
    `);

    // Step 2: Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Catgories Report");

    // Step 3: Define columns
    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Price", key: "catgoriesPrice", width: 15 },
      { header: "Category", key: "catgoriesName", width: 25 },
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
app.get("/products", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Sorting
    const allowedSortFields = [
      "products.id",
      "ProductName",
      "ProductPrice",
      "catgoriesName",
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
    const {catgoriesName  , catgoriesPrice } = row;

    const sql = 'INSERT INTO Catgories (catgoriesName, catgoriesPrice) VALUES (?, ?)';
    db1.query(sql, [catgoriesName , catgoriesPrice], (err) => {
      if (err) console.error('Insert error:', err);
    });
  });

  res.send('File uploaded and data saved!');
});


// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});