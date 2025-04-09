module.exports = (sequelize, Sequelize) => {
  const categories = sequelize.define("categories", {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING,
    },
    price: {
      type: Sequelize.STRING,
    }
  });
  return categories;
};