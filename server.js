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

app.get("/getPlatformList", (req, res) => {
  dbCon.query("SELECT DISTINCT * FROM `platform`", (error, results, fields) => {
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
  type ? query1 = "type = ?" : query1 = "1=1";
  pattern ? query2 = "pattern = ?" : query2 = "1=1";
  dbCon.query(`SELECT * FROM product_list WHERE ${query1} AND ${query2}`, [type, pattern], (error, results, fields) => {
    if (error) throw error;
    let message = "";
    if (results === undefined || results.length == 0) {
      message = "Empty";
    }
    return res.send({ error: false, data: results, message: message });
  });
});

app.post("/addSales", (req, res) => {
  let { date, platform, total_sales, prod_list } = req.body;
  prod_list = JSON.stringify(prod_list)
  if (date && platform && total_sales && prod_list) {
    dbCon.query(`INSERT INTO sales (platform,prod_list,sales_date,total_sales) VALUES(?,?,?,?)`, [platform, prod_list, date, total_sales], (error, results, fields) => {
      if (error) throw error;
      res.status(200).send({ message: 'Success' });
    });
  }
});

app.get("/getLimitOfSales", (req, res) => {
  let limit = {
    month: [],
    year: []
  }
  th_month = [
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม',
  ]
  dbCon.query(`SELECT DISTINCT MONTH(sales_date) AS month FROM sales ORDER BY month ASC`, (error, results, fields) => {
    if (error) throw error;
    if (results.length > 0) {
      for (let i = 0; i < results.length; i++) {
        limit.month.push({ intMonth: results[i].month, thMonth: th_month[results[i].month - 1] })
      }
    }
    dbCon.query(`SELECT DISTINCT YEAR(sales_date) AS year FROM sales ORDER BY year ASC`, (error, results, fields) => {
      if (error) throw error;
      if (results.length > 0) {
        for (let i = 0; i < results.length; i++) {
          limit.year.push(results[i].year)
        }
      }
      return res.send(limit);
    });
  });
});

app.post("/getSalesData", (req, res) => {
  let { month, year } = req.body;
  let platform = []
  if (month && year) {
    dbCon.query(`SELECT DISTINCT platform,platform.platform_name FROM sales INNER JOIN platform ON sales.platform=platform.platform_id WHERE YEAR(sales_date) = ? AND MONTH(sales_date) = ? ORDER BY platform`, [year, month], (error, results, fields) => {
      if (error) throw error;
      let platform = []
      for (let i = 0; i < results.length; i++) {
        platform.push({platform_id:parseInt(results[i].platform),platform_name:results[i].platform_name})
      }
      platform_query = ``
      for (let i = 0; i < platform.length; i++) {
        platform_query += `SUM(CASE WHEN platform = ${platform[i].platform_id} THEN total_sales ELSE 0 END) AS platform_${platform[i].platform_id}, `
      }
      dbCon.query(`SELECT DAY(sales_date) AS sale_day,${platform_query} SUM(total_sales) AS total_sales FROM sales WHERE YEAR(sales_date) = ? AND MONTH(sales_date) = ? GROUP BY sale_day ORDER BY sale_day ASC `, [year, month], (error, results, fields) => {
        if (error) throw error;
        // console.log(results)
        return res.send({ data: results, platform: platform });
      });

    });
  }
});

app.listen(4000, () => {
  console.log("Node App is running on port 4000");
});

module.exports = app;