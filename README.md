# Fake Product Identification using Blockchain

A decentralized supply chain authentication platform built on the Ethereum blockchain to detect and prevent counterfeit goods. The system tracks products throughout their lifecycle—from manufacturer to seller to end consumer—providing tamper-proof provenance and instant authenticity verification via QR codes.

---

## 🛠 Tech Stack

### Blockchain & Smart Contracts
- **Solidity** (`^0.8.12`): Smart contract programming language for decentralized supply chain logic
- **Ethereum**: Decentralized blockchain network
- **Truffle Suite** (`v5.11.5`): Development framework for compiling, testing, and deploying smart contracts
- **Ganache**: Local blockchain simulator for rapid testing and development

### Frontend & Web3 Integration
- **Web3.js** (`v1.x` / `v0.20.x`): Ethereum JavaScript API for interacting with smart contracts and RPC nodes
- **Truffle Contract**: Contract abstraction library for client-side contract interaction
- **MetaMask**: Ethereum wallet and browser provider (EIP-1102 compatible)
- **HTML5 / CSS3 / JavaScript (ES6+)**: Responsive web interface
- **Bootstrap 4 & jQuery**: UI layout, styling, and DOM interaction
- **HTML5-QRCode & FileSaver.js**: Client-side camera-based QR code scanning and QR image generation

### Tooling & Server
- **Node.js** (`>= v14.x` / Node 20 / Node 22)
- **Lite-Server**: Lightweight development server serving client pages and contract artifacts

---

## 🌟 Key Features

- **🏭 Manufacturer Portal**:
  - Register new products with unique serial numbers (SN), brand, price, and manufacturer metadata.
  - Automatically generate downloadable QR codes encoded with product serial numbers.
  - Authorize and register licensed sellers in the blockchain registry.
  - Transfer product ownership to authorized sellers.
  - Query registered sellers and their details.

- **🏪 Seller Portal**:
  - View products received from manufacturers available for sale.
  - Scan product QR codes or input serial numbers to sell goods to consumers.
  - Track real-time inventory and availability status.

- **👤 Consumer Portal**:
  - **Instant Verification**: Scan QR code on packaging or enter serial number and consumer ID to verify authenticity against the blockchain.
  - **Purchase History**: View full provenance history including manufacturer ID, seller ID, and transaction records.

---

## 📁 Project Structure

```
Fake-Product-Identification/
├── contracts/                  # Solidity smart contracts
│   ├── Migrations.sol          # Truffle migration contract
│   └── product.sol             # Core product & supply chain contract
├── migrations/                 # Truffle deployment scripts
│   ├── 1_initial_migration.js
│   └── 2_deploy_contract.js
├── src/                        # Frontend web application
│   ├── css/                    # Stylesheets
│   ├── js/                     # Client JavaScript & Web3 integration
│   │   ├── productApp.js
│   │   ├── sellerApp.js
│   │   ├── productDataApp.js
│   │   ├── sellerDataApp.js
│   │   ├── sellProductManufacturer.js
│   │   ├── sellProductSeller.js
│   │   ├── consumerPurchaseHistory.js
│   │   ├── verifyProduct.js
│   │   └── truffle-contract.js
│   ├── addProduct.html
│   ├── addSeller.html
│   ├── sellProductManufacturer.html
│   ├── sellProductSeller.html
│   ├── queryProducts.html
│   ├── querySeller.html
│   ├── verifyProducts.html
│   ├── consumerPurchaseHistory.html
│   └── index.html
├── bs-config.json              # Lite-server configuration
├── package.json                # Project dependencies & scripts
├── truffle-config.js           # Truffle compiler & network settings
└── README.md                   # Documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (`>= 14.x`) and `npm`
- [MetaMask](https://metamask.io/) browser extension

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd Fake-Product-Identification
npm install
```

### 3. Start Local Blockchain
You can run Ganache via the included npm script or via the Ganache GUI:

- **Using built-in Ganache script**:
  ```bash
  npm run ganache
  ```
  *This starts an RPC server at `http://127.0.0.1:7545` with Network ID `5777` and Chain ID `1337`.*

- **Using Ganache GUI**:
  - Open Ganache GUI.
  - Ensure the server port is set to `7545` (matching `truffle-config.js`).

### 4. Compile & Deploy Smart Contracts
Open a new terminal window in the project root:
```bash
# Compile Solidity contracts
npm run compile

# Deploy contracts to the local blockchain
npm run migrate
```
*(Use `npm run migrate:reset` if you need to redeploy fresh contracts).*

### 5. Configure MetaMask
1. Open the MetaMask extension in your browser.
2. Add a new network manually:
   - **Network Name**: `Ganache Local`
   - **New RPC URL**: `http://127.0.0.1:7545`
   - **Chain ID**: `1337` (or `5777`)
   - **Currency Symbol**: `ETH`
3. Import an account from Ganache:
   - In Ganache, copy the private key of any funded account (e.g. Account 0).
   - In MetaMask, click **Import Account**, paste the private key, and confirm.

### 6. Start the Web Server
```bash
npm run dev
```
The application will launch at `http://localhost:3000`.

---

## 📜 Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts `lite-server` and hosts the frontend at `http://localhost:3000` |
| `npm run ganache` | Starts a deterministic local Ethereum blockchain on port `7545` |
| `npm run compile` | Compiles Solidity contracts with solc `0.8.12` |
| `npm run migrate` | Deploys contracts to the configured Ethereum network |
| `npm run migrate:reset` | Re-compiles and re-deploys contracts from scratch |
| `npm test` | Runs contract tests via Truffle test runner |

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
