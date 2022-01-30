"use strict";
const AWS = require("aws-sdk");
const Jimp = require("jimp");
const s3 = new AWS.S3();
const { nanoid } = require("nanoid");
let imageType;
const bucket = process.env.Bucket;

exports.handler = (event) => {
  let requestBody = JSON.parse(event.body);
  let base64Image = requestBody.photoUrl;
  let objectId = nanoid(10);
  let width = parseInt(requestBody.width);
  let height = parseInt(requestBody.height);
  let parts = base64Image.split(";");
  imageType = parts[0].split(":")[1];
  let imageExt = imageType.split("/")[1];
  let imageData = parts[1].split(",")[1];
  let objectKey = `${objectId}-${width}x${height}.${imageExt}`;
  let encodedImage = Buffer.from(imageData, "base64");
  let resp;
  fetchImage(encodedImage)
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
        objectUrl: `${BucketUrl}/objectKey`,
      });
    })
    .catch((error) => {
      console.log(error);
      resp = buildResponse(500, {
        status: "failure",
        message: "Error while uploading image",
      });
    });
  return resp;
};

function uploadToS3(data, key) {
  return s3
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
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}
