const AWS = require("aws-sdk");
const { HatchBabyApi } = require("homebridge-hatch-baby-rest/lib/api");
const { delay } = require("homebridge-hatch-baby-rest/lib/util");
const dynamo = new AWS.DynamoDB.DocumentClient();

/**
 * Demonstrates a simple HTTP endpoint using API Gateway. You have full
 * access to the request and response payload, including headers and
 * status code.
 *
 * To scan a DynamoDB table, make a GET request with the TableName as a
 * query string parameter. To put, update, or delete an item, make a POST,
 * PUT, or DELETE request respectively, passing in the payload to the
 * DynamoDB API as a JSON body.
 */

let hatch;

exports.handler = async (event, context) => {
  // console.log("Received event:", JSON.stringify(event, null, 2));

  if (!hatch) {
    console.log("getting hatch device");
    const api = new HatchBabyApi({
        email: process.env.HBR_EMAIL,
        password: process.env.HBR_PASSWORD,
      }),
      restPlusLights = await api.getDevices();
    hatch = restPlusLights.restPluses[0];
  }

  let body;
  let statusCode = "200";
  const headers = {
    "Content-Type": "application/json",
  };

  try {
    switch (event.requestContext.routeKey) {
      case "DELETE":
        body = await dynamo.delete(JSON.parse(event.body)).promise();
        break;
      case "GET":
        body = await dynamo
          .scan({ TableName: event.queryStringParameters.TableName })
          .promise();
        break;
      case "POST /hatchControl/on":
        await hatch.onVolume.subscribe((i) => console.log("Volume", i));
        await hatch.setAudioTrack(3);
        await hatch.setVolume(47);
        await hatch.setPower(true);
        await delay(1000);
        console.log("turned on white noise");
        break;
      case "POST /hatchControl/off":
        await hatch.setPower(false);
        await delay(1000);
        console.log("turned off hatch");
        break;
      case "POST /hatchControl/twinkle":
        await hatch.setAudioTrack(13);
        await hatch.setVolume(25);
        await hatch.setPower(true);
        await delay(1000);
        console.log("playing twinkle twinkle");
        break;
      case "PUT":
        body = await dynamo.update(JSON.parse(event.body)).promise();
        break;
      default:
        throw new Error(
          `Unsupported resource "${event.requestContext.resourcePath}"`
        );
    }
  } catch (err) {
    statusCode = "400";
    body = err.message;
  } finally {
    body = JSON.stringify(body);
  }

  return {
    statusCode,
    body,
    headers,
  };
};
