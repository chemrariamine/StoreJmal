const handler = require("../server");

module.exports = async (request, response) => {
  await handler(request, response);
};
