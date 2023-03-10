let express = require("express");
let cors = require("cors");
let app = express();
let bodyParser = require("body-parser");
let mysql = require("mysql");
const corsOptions = {
  origin: "http://localhost:3000",
  credentials: true,
};
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors(corsOptions));

// homepage route
app.get("/", (req, res) => {
  return res.send({
    error: false,
    message: "Reserve court website API",
  });
});

let dbCon = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "asia_gold",
  port: 3307
});
dbCon.connect();

app.get("/getAllProd", (req, res) => {
  dbCon.query("SELECT * FROM product_list", (error, results, fields) => {
    if (error) throw error;
    let message = "";
    if (results === undefined || results.length == 0) {
      message = "Empty";
    }
    return res.send({ error: false, data: results, message: message });
  });
});

app.get("/getAllSales", (req, res) => {
  dbCon.query("SELECT * FROM sales", (error, results, fields) => {
    if (error) throw error;

    let message = "";
    if (results === undefined || results.length == 0) {
      message = "Empty";
    } else {
      message = "Successfully retrieved data";
    }
    return res.send({ error: false, data: results, message: message });
  });
});

app.post("/getProdList", (req, res) => {
  let { type, pattern } = req.body;
  let query1, query2
  type ? query1="type = ?" :  query1="1=1";
  pattern ? query2="pattern = ?" : query2="1=1";
  dbCon.query(`SELECT * FROM product_list WHERE ${query1} AND ${query2}`, [type, pattern], (error, results, fields) => {
    if (error) throw error;
    let message = "";
    if (results === undefined || results.length == 0) {
      message = "Empty";
    }
    dbCon.query(`SELECT * FROM product_list WHERE ${query1} AND ${query2}`, [type, pattern], (error, results, fields) => {
      if (error) throw error;
      let message = "";
      if (results === undefined || results.length == 0) {
        message = "Empty";
      }
      return res.send({ error: false, data: results, message: message });
    });
  });
});

app.listen(4000, () => {
  console.log("Node App is running on port 4000");
});

module.exports = app;