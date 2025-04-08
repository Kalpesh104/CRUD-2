const db = require("../models");
const Category = db.category;
const Product = db.product;
const { Sequelize } = require("sequelize");

// Static Responses
exports.allAccess = (req, res) => {
  res.status(200).send("Public Content.");
};

exports.userBoard = (req, res) => {
  res.status(200).send("User Content.");
};

exports.getCatgories = async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteCatgories = async (req, res) => {
  try {
    const id = req.body.id;
    await Category.destroy({ where: { id } });
    res.status(200).json({ message: "Category deleted successfully!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateCatgories = async (req, res) => {
  try {
    const { id, categoryName, categoryPrice } = req.body;
    await Category.update({ categoryName, categoryPrice }, { where: { id } });
    res.status(200).json({ message: "Category updated successfully!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addCatgories = async (req, res) => {
  try {
    const { categoryName, categoryPrice } = req.body;
    await Category.create({ categoryName, categoryPrice });
    res.status(201).json({ message: "Category added successfully!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Pagination using Sequelize
exports.pagnitations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Product.findAndCountAll({
      limit,
      offset,
    });

    res.status(200).json({
      data: rows,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    });
  } catch (error) {
    console.error("Pagination error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
