var AWS = require("aws-sdk");
AWS.config.update({region: "us-east-1"});
const tableName = "prescription";

var dbHelper = function () { };
var docClient = new AWS.DynamoDB.DocumentClient();


dbHelper.prototype.getTablet = (profileEmail) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName,
            FilterExpression: "#emailID = :email_id",
            ExpressionAttributeNames: {
                "#emailID": "email"
            },
            ExpressionAttributeValues: {
                ":email_id": profileEmail
            }
        }
        docClient.scan(params, (err, data) => {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                return reject(JSON.stringify(err, null, 2))
            } 
            console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
            resolve(data.Items)
            
        })
    });
}

module.exports = new dbHelper();