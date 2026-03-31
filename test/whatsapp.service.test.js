const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const https = require("node:https");

const servicePath = require.resolve("../src/utils/whatsapp.service.js");

const trackedEnvKeys = [
  "MAYTAPI_PRODUCT_ID",
  "MAYTAPI_PHONE_ID",
  "MAYTAPI_TOKEN",
  "WHATSAPP_GROUP_IDS_HOT_COIL"
];

const originalEnv = Object.fromEntries(
  trackedEnvKeys.map((key) => [key, process.env[key]])
);

const restoreEnv = () => {
  delete require.cache[servicePath];

  for (const key of trackedEnvKeys) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
};

const run = async () => {
  process.env.MAYTAPI_PRODUCT_ID = "product-123";
  process.env.MAYTAPI_PHONE_ID = "phone-456";
  process.env.MAYTAPI_TOKEN = "token-789";
  process.env.WHATSAPP_GROUP_IDS_HOT_COIL =
    "12001@g.us, 12002@g.us, ,12003@g.us ";

  const originalRequest = https.request;
  const calls = [];

  https.request = (options, callback) => {
    const req = new EventEmitter();
    let body = "";

    req.write = (chunk) => {
      body += chunk;
    };

    req.end = () => {
      const res = new EventEmitter();
      res.statusCode = 200;
      callback(res);

      process.nextTick(() => {
        calls.push({
          options,
          payload: JSON.parse(body)
        });
        res.emit("data", JSON.stringify({ ok: true }));
        res.emit("end");
      });
    };

    return req;
  };

  try {
    delete require.cache[servicePath];
    const whatsappService = require(servicePath);

    await whatsappService.sendHotCoilNotification(
      {
        sample_timestamp: "2026-03-31T08:30:00.000Z",
        unique_code: "HC-001",
        sms_short_code: "SMS-01",
        size: "10mm",
        mill_incharge: "Test Incharge"
      },
      {
        sample_timestamp: "2026-03-31T08:00:00.000Z",
        unique_code: "SMS-001",
        sequence_number: "SEQ-11"
      }
    );
  } finally {
    https.request = originalRequest;
  }

  assert.equal(calls.length, 3);
  assert.deepEqual(
    calls.map((call) => call.payload.to_number),
    ["12001@g.us", "12002@g.us", "12003@g.us"]
  );
  assert.ok(
    calls.every(
      (call) =>
        call.options.path ===
        "/api/product-123/phone-456/sendMessage?token=token-789"
    )
  );
  assert.ok(
    calls.every(
      (call) =>
        call.payload.type === "text" &&
        typeof call.payload.message === "string" &&
        call.payload.message.includes("Hot Coil Register Fields")
    )
  );
};

run()
  .then(() => {
    console.log(
      "PASS: sendHotCoilNotification sent one request per WhatsApp group ID."
    );
  })
  .catch((error) => {
    console.error(
      "FAIL: sendHotCoilNotification did not handle multiple WhatsApp group IDs."
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    restoreEnv();
  });
