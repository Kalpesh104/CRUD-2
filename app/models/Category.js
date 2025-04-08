module.exports = (sequelize, Sequelize) => {
    const Catgories = sequelize.define("Catgories", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true
      },
      catgoriesName: {
        type: Sequelize.STRING
      },
      catgoriesPrice: {
        type: Sequelize.STRING
      }
    }) 
    return Catgories;
  };
  