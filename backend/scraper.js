import { OpenAI } from "openai";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import * as cheerio from "cheerio";
import { Builder, By, until } from "selenium-webdriver";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: "", //Your API key,
});

// Scrape endpoint
app.post("/scrape", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).send({ error: "URL is required" });

  let driver;
  try {
    driver = await new Builder().forBrowser("chrome").build();
    await driver.get(url);
    await driver.wait(until.elementLocated(By.id("container")), 10000);

    const pageSource = await driver.getPageSource();
    const $ = cheerio.load(pageSource);
    const textContent = $("body").text().trim();

    res.send({ content: textContent });
  } catch (error) {
    res.status(500).send({ error: "Scraping failed", details: error.message });
  } finally {
    if (driver) await driver.quit();
  }
});

// AI Query endpoint
app.post("/ai-query", async (req, res) => {
  const { prompt, scrapedContent } = req.body;
  if (!prompt || !scrapedContent) {
    return res
      .status(400)
      .send({ error: "Prompt and scraped content are required" });
  }

  try {
    const aiResponse = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: `Extract the following from the content: ${prompt}\n\nContent: ${scrapedContent}`,
      max_tokens: 150,
    });

    res.send({ result: aiResponse.data.choices[0].text.trim() });
  } catch (error) {
    res
      .status(500)
      .send({ error: "AI processing failed", details: error.message });
  }
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
