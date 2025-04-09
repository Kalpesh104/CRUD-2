module.exports = (sequelize, Sequelize) => {
  const products = sequelize.define("products", {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING,
    },
    image: {
      type: Sequelize.STRING,
    },
    price: {
      type: Sequelize.STRING,
    }, 
    categoryId: {
      type: Sequelize.INTEGER,
      references: {
        model: "categories", // table name (not model name)
        key: "id",
      },
    }
  });
  return products;
};
