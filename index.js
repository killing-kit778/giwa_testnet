// Configuration
const CONTRACT_ADDRESS = "0x30bDe02387EA7967b8C75a5189a1b2A61F8F4e22";  // Your correct contract address
const GIWA_SEPOLIA_CHAIN_ID = 91342;

// Minimal ABI for your original Storage contract (no owner or events)
const ABI = [
  "function store(uint256 num)",
  "function retrieve() public view returns (uint256)"
];

let contract;
let signer;
let isOwner = false;  // We'll fake this for now since original contract has no owner

// Helper: Safe text update
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// Initialize
async function init() {
  if (typeof ethers === "undefined") {
    document.getElementById("status").innerText = "❌ Ethers.js failed to load!";
    return;
  }

  document.getElementById("status").innerText = "✅ Ethers.js loaded successfully!";

  if (window.ethereum) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    try {
      const network = await provider.getNetwork();
      if (network.chainId.toString() === GIWA_SEPOLIA_CHAIN_ID.toString()) {
        document.getElementById("network-warning").style.display = "none";
      } else {
        document.getElementById("network-warning").innerText = `⚠️ Wrong network! Please switch to Giwa Sepolia (Chain ID: ${GIWA_SEPOLIA_CHAIN_ID})`;
        document.getElementById("network-warning").style.display = "block";
      }

      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        connectWallet(); // Restore connection
      }
    } catch (err) {
      console.error(err);
    }
  }
}

// Connect Wallet
async function connectWallet() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    setText("user-address", userAddress);
    
    const connectBtn = document.getElementById("connect-btn");
    if (connectBtn) {
      connectBtn.textContent = "🔄 Connected";
      connectBtn.disabled = true;
    }

    // Setup contract
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    // Load data
    await loadContractData(userAddress);
    await updateNetworkInfo(provider);

    // Watch for chain changes
    window.ethereum.on("chainChanged", () => window.location.reload());
  } catch (err) {
    alert("Connect wallet failed: " + err.message);
  }
}

async function updateNetworkInfo(provider) {
  try {
    const network = await provider.getNetwork();
    setText("network-info", `Chain ID: ${network.chainId}`);
  } catch (err) {
    setText("network-info", "Unknown");
  }
}

// Load Contract Data
async function loadContractData(userAddress) {
  try {
    const currentValue = await contract.retrieve();

    setText("contract-address", CONTRACT_ADDRESS);
    setText("current-value", currentValue.toString());
    setText("contract-owner", "Not applicable (original contract has no owner)");  // Since no owner function
    setText("is-owner", "Yes (no restrictions) ✅");  // Original contract allows anyone

    // Enable buttons (original contract has no restrictions)
    document.getElementById("store-btn").disabled = false;
    document.getElementById("transfer-btn").disabled = true;  // Disable since not supported

  } catch (err) {
    console.error("Load error:", err);
    alert("Error loading contract data: " + (err.reason || err.message) + ". Check address/ABI/network.");
  }
}

// Functions
async function retrieve() {
  try {
    const value = await contract.retrieve();
    alert("retrieve() returned: " + value.toString());
  } catch (err) {
    alert("Error: " + (err.reason || err.message));
  }
}

async function callNumber() {
  alert("Not supported in original contract. Deploy V2 for this.");
}

async function getOwner() {
  alert("Not supported in original contract. Deploy V2 for this.");
}

async function getContractInfo() {
  try {
    const value = await contract.retrieve();
    alert(`Contract Info:\nValue: ${value}\nOwner: Not applicable`);
  } catch (err) {
    alert("Error: " + (err.reason || err.message));
  }
}

// Store Value
async function storeValue() {
  const input = document.getElementById("value-input");
  const num = parseInt(input.value);
  if (isNaN(num) || num < 0) {
    alert("Please enter a valid number >= 0");
    return;
  }

  try {
    const tx = await contract.store(num);
    document.getElementById("status").innerText = "⏳ Transaction pending...";
    await tx.wait();
    document.getElementById("status").innerText = "✅ Value stored successfully!";
    await loadContractData(await signer.getAddress());
    input.value = "";
  } catch (err) {
    document.getElementById("status").innerText = "❌ Transaction failed: " + (err.reason || err.message);
    console.error(err);
  }
}

// Transfer Ownership (Disabled for original contract)
async function transferOwnership() {
  alert("Not supported in original contract. Deploy V2 for ownership features.");
}

// Load Events (Disabled for original contract)
async function loadEvents() {
  alert("Not supported in original contract. Deploy V2 for events.");
}

// Disconnect Wallet
function disconnectWallet() {
  window.location.reload();
}

// Initialize on load
window.onload = init;
