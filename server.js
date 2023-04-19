let express = require("express");
let cors = require("cors");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
let app = express();
let bodyParser = require("body-parser");
let mysql = require("mysql");
const corsOptions = {
  origin: ["http://localhost:3000", "https://asiagold-vzx3zwe6dq-an.a.run.app"],
  credentials: true,
};
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors(corsOptions));

const PORT = process.env.PORT || 4000
// homepage route
app.get("/", (req, res) => {
  return res.send({
    error: false,
    message: "asia gold",
  });
});

let dbCon = mysql.createConnection({
  host: "34.143.163.250",
  user: "root",
  password: `z4K]?_pVd3A1)4"v`,
  database: "asia_gold",
  port: 3306
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
  let prod_list_string = JSON.stringify(prod_list)
  let conflict = {}
  let count = 0
  for (let i = 0; i < prod_list.length; i++) {
    let temp_weight = prod_list[i].weight
    let weight = parseFloat(temp_weight.split(/[()]/)[1])
    let weight_th = temp_weight.split(/[()]/)[0]
    dbCon.query(`SELECT remain FROM product_list WHERE type =? AND pattern=? AND weight_th=? AND TRIM(weight)=?`, [prod_list[i].type, prod_list[i].pattern, weight_th, weight], (error, results, fields) => {
      if (error) throw error;
      if (prod_list[i].qty > results[0].remain) {
        conflict = { ...prod_list[i] }
        conflict.stock_remain = results[0].remain
        count = count + 1
      }
      if (i == prod_list.length - 1) {
        if (date && platform && total_sales && prod_list) {
          if (count == 0) {
            for (let j = 0; j < prod_list.length; j++) {
              let temp_weight = prod_list[j].weight
              let weight = parseFloat(temp_weight.split(/[()]/)[1])
              let weight_th = temp_weight.split(/[()]/)[0]
              dbCon.query(`UPDATE product_list SET remain = remain - ? WHERE type =? AND pattern=? AND weight_th=? AND TRIM(weight)=? AND remain >= ?`, [prod_list[j].qty, prod_list[j].type, prod_list[j].pattern, weight_th, weight, prod_list[j].qty], (error, results, fields) => {
                if (error) throw error;
                if (j == prod_list.length - 1) {
                  dbCon.query(`INSERT INTO sales (platform,prod_list,sales_date,total_sales) VALUES(?,?,?,?)`, [platform, prod_list_string, date, total_sales], (error, results, fields) => {
                    if (error) throw error;
                    return res.status(200).send({ message: 'Success' });
                  });
                }
              });
            }
          }
          else {
            return res.status(201).send(conflict);
          }
        }
      }
    })
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
        platform.push({ platform_id: parseInt(results[i].platform), platform_name: results[i].platform_name })
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
app.post("/addUser", (req, res) => {
  let { username, password, prefix, name, position, tel } = req.body;
  bcrypt.hash(password, 10, function (err, hash) {
    if (err) {
      return res.status(500).send({ message: 'Hash error' });;
    }
    password = hash;
    if (username && password && prefix && name && position && tel) {
      let split_name = name.split(' ')
      let first_name = split_name[0]
      let last_name = split_name[split_name.length - 1]
      let updated_at = new Date()
      dbCon.query(`INSERT INTO user (prefix,first_name,last_name,position,tel,username,password,updated_at,role) VALUES(?,?,?,?,?,?,?,?,?)`, [prefix, first_name, last_name, position, tel, username, password, updated_at, 'user'], (error, results, fields) => {
        if (error) throw error;
        res.status(200).send({ message: 'Success' });
      });
    }
  });
})
app.post("/getUser", (req, res) => {
  let { username } = req.body
  let query = '1'
  if (username) {
    query = `username = '${username}'`
  }
  dbCon.query(`SELECT prefix,first_name,last_name,position,tel,username,created_at,updated_at,role FROM user WHERE ${query} `, (error, results, fields) => {
    if (error) throw error;
    // console.log(results)
    return res.send({ data: results });
  });
})
// UPDATE user SET prefix=?, first_name = ?, last_name = ?,position = ?,tel = ?,password =?,updated_at=? WHERE username = ?;`, [prefix, first_name, last_name, position, tel, password, updated_at]
app.post("/editUserData", async (req, res) => {
  let { username, password, prefix, name, position, tel } = req.body;
  if (password) {
    let hash_pwd = await bcrypt.hash(password, 10);
    password = hash_pwd
  }
  if (username && prefix && name && position && tel) {
    let split_name = name.split(' ')
    let first_name = split_name[0]
    let last_name = split_name[split_name.length - 1]
    let updated_at = new Date()
    dbCon.query(`UPDATE user SET prefix=?, first_name = ?, last_name = ?,position = ?,tel = ?,updated_at=? WHERE username = ?`, [prefix, first_name, last_name, position, tel, updated_at, username], (error, results, fields) => {
      if (error) throw error;
      // console.log(results[0].password)
      // res.send(results[0].password)
      if (password) {
        dbCon.query('UPDATE user SET password = ? WHERE username = ?', [password, username], (error, results, fields) => {
          if (error) throw error;
          res.status(200).send({ message: 'Success1' });
        })
      } else {
        res.status(200).send({ message: 'Success2' });
      }
    });
  }
})
app.post("/delUser", (req, res) => {
  let { username } = req.body
  if (username) {
    dbCon.query(`DELETE FROM user WHERE username = ?`, [username], (error, results, fields) => {
      if (error) throw error;
      res.status(200).send({ message: 'Success' });
    })
  }
})
app.post("/editProdData", (req, res) => {
  let { code, type, pattern, weight, remain } = req.body
  let weight_th
  let splitValue = weight.split('(');
  weight = splitValue[1].replace(')', '');
  weight_th = splitValue[0];

  // return res.send({ data: weight,weight_th });
  if (code && type && pattern && weight) {
    dbCon.query(`UPDATE product_list SET type=?, pattern = ?, weight= ?,weight_th= ?,remain = ? WHERE id = ?`, [type, pattern, parseFloat(weight), weight_th, parseInt(remain), code], (error, results, fields) => {
      if (error) throw error;
      // console.log(results)
      res.status(200).send({ message: 'Success' });
    });
  }
})
app.post("/delProd", (req, res) => {
  let { id } = req.body
  // console.log(id)
  if (id) {
    dbCon.query(`DELETE FROM product_list WHERE id = ?`, [id], (error, results, fields) => {
      if (error) throw error;
      res.status(200).send({ message: 'Success' });
    })
  }
})
app.post("/addProd", (req, res) => {
  let { type, pattern, weight, remain } = req.body
  // console.log(req.body)
  if (type && pattern && weight) {
    let weight_th
    let splitValue = weight.split('(');
    weight = splitValue[1].replace(')', '');
    weight_th = splitValue[0];
    dbCon.query(`INSERT INTO product_list (id, type, pattern, weight, weight_th, remain) VALUES (NULL, ?, ?, ?, ?, ?);`, [type, pattern, parseFloat(weight), weight_th, remain], (error, results, fields) => {
      if (error) throw error;
      res.status(200).send({ message: 'Success' });
    })
  }
})
app.post("/graphData", (req, res) => {
  let { date, month, year, platform, is_dailyGraph } = req.body
  let query = ''
  if (date && platform) {
    query = ` AND DAY(sales_date)=${date} AND platform=${platform}`
  }
  if (month, year) {
    let response = {}
    dbCon.query(`SELECT platform,platform.platform_name,SUM(total_sales) as total_sales FROM sales INNER JOIN platform ON sales.platform = platform.platform_id WHERE MONTH(sales_date) = ? AND YEAR(sales_date) = ? GROUP BY platform`, [month, year], (error, results, fields) => {
      if (error) throw error;
      response.sales = results
      dbCon.query(`SELECT prod_list FROM sales WHERE MONTH(sales_date) = ? AND YEAR(sales_date) = ?${query}`, [month, year], (error, results, fields) => {
        if (error) throw error;
        if (results.length > 0) {
          let all_sales = []
          for (let i = 0; i < results.length; i++) {
            let temp = JSON.parse(results[i].prod_list)
            all_sales = all_sales.concat(temp)
          }
          let best_seller
          if (is_dailyGraph == true) {
            best_seller = all_sales.reduce((acc, cur) => {
              let existingType = acc.find(item => item.pattern === cur.pattern && item.type === cur.type);
              if (existingType) {
                existingType.qty += cur.qty;
              } else {
                acc.push({ type: cur.type, pattern: cur.pattern, qty: cur.qty });
              }
              return acc;
            }, []);
          }
          else {
            best_seller = all_sales.reduce((acc, cur) => {
              let existingType = acc.find(item => item.type === cur.type);
              if (existingType) {
                existingType.qty += cur.qty;
              } else {
                acc.push({ type: cur.type, qty: cur.qty });
              }
              return acc;
            }, []);
          }
          response.best_seller = best_seller
          // console.log(response)
        }
        res.status(200).send(response);
      })
    })
  }
  else {
    res.status(400).send('require body');
  }
})
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  // Find user by username
  dbCon.query('SELECT * FROM user WHERE username = ?', [username], async (err, results) => {
    if (err) {
      console.error('Error querying database:', err.stack);
      return res.status(500).json({ message: 'Internal server error' });
    }
    // If user not found, send error response
    if (results.length === 0) {
      return res.status(402).json({ message: 'username not found' });
    }
    const user = results[0];
    // Compare password
    const isValidPassword = await bcrypt.compare(password, user.password);
    // If password doesn't match, send error response
    if (!isValidPassword) {
      return res.status(401).json({ message: 'รหัสผ่านผิด' });
    }
    else {
      const token = jwt.sign({ username: user.username }, 'asia_gold_secret_key$')
      return res.json({ token })
    }
  });
})
app.get('/user', (req, res) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    const decoded = jwt.verify(token, 'asia_gold_secret_key$')
    const { username } = decoded
    dbCon.query('SELECT username,prefix,first_name,last_name,position,tel,created_at,updated_at,role FROM user WHERE username = ?', [username], (err, results) => {
      if (err) {
        console.error(err)
        return res.status(500).json({ error: 'Internal Server Error' })
      }
      if (results.length === 0) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const user = results[0]
      return res.json({ user: user })
    })
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
})
app.listen(PORT, () => {
  console.log("Node App is running on port "+PORT);
});

module.exports = app;