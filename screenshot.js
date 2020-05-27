const puppeteer = require('puppeteer');
const { Storage } = require('@google-cloud/storage');
const GOOGLE_CLOUD_PROJECT_ID = "acg-cloudrun";
const BUCKET_NAME = "acg-cloudrun-screenshots";

exports.screenshot = async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.send('Please provide URL as GET parameter, for example: <a href="?url=https://example.com">?url=https://example.com</a>');
  }

  const browser = await puppeteer.launch({
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({"width":1920,"height":1080})
  await page.goto(url, {waitUntil: 'networkidle0', timeout: 60000});
  const imageBuffer = await page.screenshot();
  browser.close();

  try {
    var filename = url.replace(/^https?:\/\//,'') + "/screenshot.png"
    let screenshotUrl = await uploadToGoogleCloud(imageBuffer, filename);
    res.status(200).send(JSON.stringify({
      'screenshotUrl': screenshotUrl
    }));
  } catch (error) {
    res.status(422).send(JSON.stringify({
      error: error.message,
    }));
  }

};

async function uploadToGoogleCloud(buffer, filename) {
  const storage = new Storage({
    projectId: GOOGLE_CLOUD_PROJECT_ID,
  });

  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(filename);
  await uploadBuffer(file, buffer, filename);
  return `https://${BUCKET_NAME}.storage.googleapis.com/${filename}`;
}

async function uploadBuffer(file, buffer, filename) {
  return new Promise((resolve) => {
    file.save(buffer, { destination: filename }, () => {
      resolve();
    });
  })
}
