"use strict";
const AWS = require("aws-sdk");
AWS.config.update({
  region: "us-east-1",
});
const uploadPath = "/upload";
const checkPath = "/check";
const Jimp = require("jimp");
const s3 = new AWS.S3();
const { nanoid } = require("nanoid");
let imageType;
const bucket = process.env.Bucket;
const BucketUrl = process.env.BucketUrl;
exports.handler = async function (event, context, callback) {
  let requestBody = JSON.parse(event.body);
  let response;
  switch (true) {
    case event.httpMethod === "GET" && event.path === checkPath:
      response = buildResponse(200, "Api Working");
      break;
    case event.httpMethod === "POST" && event.path === uploadPath:
      response = await processRequest(requestBody, callback);
      break;
    default:
      response = buildResponse(400, "Nope");
  }
  return response;
};
async function processRequest(requestBody, callback) {
  let base64Image = requestBody.photoUrl;
  let objectId = nanoid(10);
  let width = parseInt(requestBody.width);
  let height = parseInt(requestBody.height);
  let parts = base64Image.split(";");
  imageType = parts[0].split(":")[1];
  let imageExt = imageType.split("/")[1];
  let imageData = parts[1].split(",")[1];
  let objectKey = `${objectId}-${width}x${height}.${imageExt}`;
  let decodedImage = Buffer.from(imageData, "base64");
  let resp;
  await fetchImage(decodedImage)
    .then((image) => {
      return image.resize(width, height).getBufferAsync(imageType);
    })
    .then((resizedBuffer) => {
      return uploadToS3(resizedBuffer, objectKey);
    })
    .then(function (response) {
      console.log(`Image ${objectKey} was uploaded and resized`);
      resp = buildResponse(200, {
        status: "success",
        objectUrl: `${BucketUrl}/${objectKey}`,
      });
    })
    .catch((error) => {
      resp = buildResponse(500, {
        status: "failure",
        message: "Error while uploading image",
      });
    });
  return resp;
}
async function uploadToS3(data, key) {
  return await s3
    .putObject({
      Bucket: bucket,
      Key: key,
      Body: data,
      ContentType: imageType,
    })
    .promise();
}

function fetchImage(url) {
  return Jimp.read(url);
}
function buildResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
    },
    body: JSON.stringify(body),
  };
}
