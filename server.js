const express = require("express");
const cors = require("cors");
const cookieSession = require("cookie-session");
const app = express();
const mysql = require("mysql2");
app.use(cors());
const ExcelJS = require("exceljs");


/* for Angular Client (withCredentials) */
// app.use(
//   cors({
//     credentials: true,
//     origin: ["http://localhost:8081"],
//   })
// );

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

app.use(
  cookieSession({
    name: "bezkoder-session",
    keys: ["COOKIE_SECRET"], // should use as secret environment variable
    httpOnly: true,
    sameSite: "strict",
  }),
);

// database
const db = require("./app/models");
const Role = db.role;

db.sequelize.sync();
// force: true will drop the table if it already exists
// db.sequelize.sync({force: true}).then(() => {
//   console.log('Drop and Resync Database with { force: true }');
//   initial();
// });
// simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to bezkoder application." });
});
// routes
require("./app/routes/auth.routes")(app);
require("./app/routes/user.routes")(app);

const db1 = mysql
  .createConnection({
    host: "localhost",
    user: "root",
    password: "root1",
    database: "ecommerce",
  })
  .promise(); // <- enables use of await

// Example paginated endpoint
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
app.get("/download-products-report", async (req, res) => {
  try {
    // Step 1: Fetch data from MySQL
    const [rows] = await db1.query(`
      SELECT 
        products.id, 
        products.name AS product_name, 
        products.price, 
        categories.name AS category_name
      FROM products
      LEFT JOIN categories ON products.categoryId = categories.id
    `);

    // Step 2: Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Products Report");

    // Step 3: Define columns
    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Product Name", key: "product_name", width: 30 },
      { header: "Price", key: "price", width: 15 },
      { header: "Category", key: "category_name", width: 25 },
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

// set port, listen for requests
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

/*************  ✨ Windsurf Command ⭐  *************/
/**
 * Initializes the database with default roles.
 * Creates 'user', 'moderator', and 'admin' roles in the Role table.
 */

/*******  dc2da045-b4d9-4a20-9810-807b99a2ddd2  *******/
function initial() {
  Role.create({
    id: 1,
    name: "user",
  });

  Role.create({
    id: 2,
    name: "moderator",
  });

  Role.create({
    id: 3,
    name: "admin",
  });
}
