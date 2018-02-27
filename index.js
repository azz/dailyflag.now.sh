const fs = require("fs");
const util = require("util");
const readFile = util.promisify(fs.readFile);
const countries = require("svg-country-flags/countries");
const codes = Object.keys(countries);
const { send } = require("micro");

const CDN = "https://cdn.rawgit.com/hjnilsson/country-flags/6dc35d6c/svg/";

const styles = `
  <style>
  body {
    background: lightgrey;
  }
  h1 {
    font-family: Candara, Calibri, Segoe, "Segoe UI", Optima, Arial, sans-serif;
    margin: 0;
    text-align: center;
  }
  </style>  
`;

module.exports = async (req, res) => {
  const days = msToDay(Date.now());
  const match = req.url.match(/^\/(\w{2})$/);
  const codeIsTodays = !match;
  const code = codeIsTodays
    ? codes[days % codes.length]
    : match[1].toUpperCase();
  const name = countries[code];

  if (!name) {
    return send(
      res,
      404,
      `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>404 - 🏴 Not Found</title>
          ${styles}
        </head>
      </html>
      <h1>404 - 🏴 Not Found</h1>
      `
    );
  }

  const title = `${codeIsTodays ? "🏴 of the day: " : ""} ${name}`;

  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      ${styles}
      <style>
      .Container {
        display: flex;
        flex-direction: column;
        height: 100vh;
      }
      .Flag {
        flex-grow: 1;
        object-fit: contain;
      }
      .Title {
        padding: 0.5em;
      }
      </style>
      <title>${title}</title>
    </head>
    
    <div class=Container>
      <img class=Flag src="${CDN}${code.toLowerCase()}.svg">
      <h1 class=Title>${title}</h1>
    </div>
  `;
};

const msToDay = ms => Math.floor(ms / 1000 / 60 / 60 / 24);
