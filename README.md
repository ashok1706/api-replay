# 🚀 api-traffic-replay

**Debug production API issues locally by replaying real requests.**

---

## 😩 The Problem

Ever faced this?

* Bugs only happen in production
* You can't reproduce the exact API request
* Missing headers, auth tokens, or payload
* Logs don’t give the full picture

👉 Result: hours wasted debugging something you can’t recreate.

---

## ⚡ The Solution

`api-traffic-replay` records real API requests and lets you **replay them locally with full context**.

* Same request
* Same headers
* Same payload

And now… you can finally debug it.

---

## 🔥 Features

* 📥 Record real API traffic (request + response)
* 🔁 Replay requests locally or in staging
* 🔍 Detect response differences (diff)
* 🛡️ Mask sensitive headers (auth, cookies)
* ⚡ Zero-config setup
* 💻 CLI support for replay & debugging

---

## 🧪 Quick Start

### 1. Install

```bash
npm install api-traffic-replay
```

---

### 2. Add Middleware

```js
import express from 'express';
import { apiReplay } from 'api-traffic-replay';

const app = express();

app.use(apiReplay());

app.get('/test', (req, res) => {
  res.json({ ok: true });
});

app.listen(3000);
```

---

### 3. Run your app

Requests will now be automatically recorded.

---

## 💻 CLI Usage

```bash
# List recorded requests
npx api-traffic-replay list

# Replay a request
npx api-traffic-replay replay <requestId>

# Compare responses (diff)
npx api-traffic-replay diff <requestId>
```

---

## 🔍 Example Diff Output

```diff
❌ Differences detected:

- total: 100 → 120
- status: "success" → "failed"
```

---

## ⚙️ Configuration

```js
app.use(apiReplay({
  ignore: ['/health', '/metrics'],
  maskHeaders: ['authorization', 'cookie']
}));
```

---

## 🎯 Use Cases

* 🐛 Debug production-only bugs
* 🔄 Validate API changes before deployment
* 🧪 Replay real requests for testing
* 💳 Investigate payment or third-party API issues
* ⚠️ Detect breaking changes in CI

---

## 🛡️ Security

Sensitive data like tokens and cookies can be masked using configuration options.

---

## 🧠 How It Works

1. Middleware captures incoming request + response
2. Stores it locally
3. CLI replays the same request
4. Diff engine highlights what changed

---

## 🚀 Why use this?

Unlike logging or testing tools:

* Uses **real production traffic**
* Requires **zero setup**
* Helps you **reproduce issues instantly**

---

## 🔮 Roadmap

* Web dashboard for replay sessions
* CI/CD integration for automated diff checks
* Team collaboration (share request IDs)
* Remote storage (S3, DB)

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit PRs.

---

## ⭐ Support

If you find this useful, please ⭐ the repo and share it!

---

## 🧾 License

MIT
