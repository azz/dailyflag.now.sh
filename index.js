const getTimeZoneOffset = require("get-timezone-offset");
const countries = require("iso3166-1/data/countries");
const shuffleArray = require("shuffle-array");
const timeago = require("timeago.js");
const { send } = require("micro");
const { get } = require("axios");
const util = require("util");
const url = require("url");
const mem = require("mem");
const fs = require("fs");

const ipLocation = util.promisify(require("iplocation"));
const readFile = util.promisify(fs.readFile);

const CDN = "https://cdn.rawgit.com/hjnilsson/country-flags/6dc35d6c/svg/";
const API = "https://restcountries.eu/rest/v2/alpha/";

const codes = shuffleArray(countries.map(country => country.alpha2), {
  rng: () => 0.5
});

const styles = `
  <style>
  body {
    background: lightgrey;
  }
  pre {
    margin: 6px;
  }
  h1 {
    font-family: Candara, Calibri, Segoe, "Segoe UI", Optima, Arial, sans-serif;
    margin: 0;
    text-align: center;
  }
  </style>  
`;

module.exports = async (req, res) => {
  const codeMatch = req.url.match(/^\/(\w{2})$/);
  const useRandom = req.url === "/random";
  const codeIsTodays = !codeMatch && !useRandom;
  const dayValue = await getDayValue(req);
  const newFlagIn = 1 - (dayValue - Math.floor(dayValue));
  const newFlagInStr = timeago().format(Date.now() + dayToMs(newFlagIn));

  const code = codeIsTodays
    ? codes[Math.floor(dayValue) % codes.length]
    : useRandom ? shuffleArray.pick(codes) : codeMatch[1].toUpperCase();

  let info;
  try {
    info = await getInfo(code);
  } catch (error) {
    return notFound(res);
  }
  const { name, capital, subregion, population } = info;

  const title = `${codeIsTodays ? "🏴 of the day: " : ""} ${name}`;

  const infoStr = [
    `Region: ${subregion}`,
    `Capital: ${capital}`,
    `Population: ${formatNumber(population)}`
  ].join(" | ");

  const footer = [
    codeIsTodays ? `New flag ${newFlagInStr}` : `<a href="/">Today's Flag</a>`,
    `<a href="/random">Random</a>`,
    `<a href="https://github.com/azz/dailyflag.now.sh">Source Code</a>`
  ].join(" | ");

  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      ${styles}
      <style>
      .Container {
        text-align: center;
      }
      .Flag {
        width: 960px;
        max-width: 100%;
        max-height: calc(100vh - 120px);
        object-fit: contain;
      }
      .Title {
        padding: 0;
      }
      </style>
      <title>${title}</title>
    </head>
    
    <body class=Container>
      <h1 class=Title>${title}</h1>
      <pre class=Info>${infoStr}</pre>
      <img class=Flag src="${CDN}${code.toLowerCase()}.svg">
      <pre class=Footer>${footer}</pre>
    </body>
  </html>
  `;
};

const msToDay = (ms, offset) => ms / 1000 / 60 / 60 / 24 - offset / 24;

const dayToMs = day => day * 1000 * 60 * 60 * 24;

const getDayValue = async req => {
  const { query } = url.parse(req.url, true);
  const ip = req.connection.remoteAddress;

  const { timezone = "UTC" } = query.timezone ? query : await ipLocation(ip);
  const offset = getTimeZoneOffset(timezone, new Date()) / 60;

  return msToDay(Date.now(), offset);
};

const notFound = res =>
  send(
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

const getInfo = mem(async code => {
  return (await get(API + code)).data;
});

const formatNumber = number => new Intl.NumberFormat().format(number);
