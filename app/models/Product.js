module.exports = (sequelize, Sequelize) => {
  const products = sequelize.define("products", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
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
      type: Sequelize.STRING,
    },
  });
  return products;
};
