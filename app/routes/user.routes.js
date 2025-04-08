const { authJwt } = require("../middleware");
const controller = require("../controllers/user.controller");
const express = require('express');


module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, Content-Type, Accept"
    );
    next();
  });

  //Paginations
  
  // Create MySQL connection with Promise support
 

  app.get("/api/test/all", controller.allAccess);

  app.get(
    "/api/test/user",
    [authJwt.verifyToken],
    controller.userBoard
  );
  app.get(
    "/api/test/catgories",
    [authJwt.verifyToken],
    controller.getCatgories
  );

  app.delete(
    "/api/test/catgories",
    [authJwt.verifyToken],
    controller.deleteCatgories
  );

  app.put(
    "/api/test/catgories",
    [authJwt.verifyToken],
    controller.updateCatgories
  );

  app.post(
    "/api/test/catgories",
    [authJwt.verifyToken],
    controller.addCatgories
  );

  // app.get(
  //   "/api/test/mod",
  //   [authJwt.verifyToken, authJwt.isModerator],
  //   controller.moderatorBoard
  // );

  // app.get(
  //   "/api/test/admin",
  //   [authJwt.verifyToken, authJwt.isAdmin],
  //   controller.adminBoard
  // );
};
