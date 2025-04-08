module.exports = (sequelize, Sequelize) => {
    const Product = sequelize.define("Product", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true
      },
      ProductsName: {
        type: Sequelize.STRING
      },
      ProductPrice: {
        type: Sequelize.STRING
      }
    }) 
    return Product;
  };
  