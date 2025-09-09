// Configuration
const CONTRACT_ADDRESS = "0x30bDe02387EA7967b8C75a5189a1b2A61F8F4e22";  // Your correct address
const GIWA_SEPOLIA_CHAIN_ID = 91342;

// Replace with your contract ABI — include retrieve, store, owner, transferOwnership, NumberStored event
const ABI = [
  "function retrieve() view returns (uint256)",
  "function store(uint256 num)",
  "function owner() view returns (address)",
  "function transferOwnership(address newOwner)",
  "event NumberStored(uint256 num)"
];

let contract;
let signer;
let isOwner = false;

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

    document.getElementById("user-address").textContent = userAddress;
    
    // Safety check: Only update if button exists
    const connectBtn = document.getElementById("connect-btn");
    if (connectBtn) {
      connectBtn.textContent = "🔄 Connected";
      connectBtn.disabled = true;  // Optional: Disable after connect
    } else {
      console.warn("Connect button not found — skipping UI update");
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
    document.getElementById("network-info").textContent = `Chain ID: ${network.chainId}`;
  } catch (err) {
    document.getElementById("network-info").textContent = "Unknown";
  }
}

// Load Contract Data
async function loadContractData(userAddress) {
  try {
    const currentValue = await contract.retrieve();
    const contractOwner = await contract.owner();

    document.getElementById("contract-address").textContent = contract.target;
    document.getElementById("current-value").textContent = currentValue.toString();
    document.getElementById("contract-owner").textContent = contractOwner;

    isOwner = (userAddress.toLowerCase() === contractOwner.toLowerCase());
    document.getElementById("is-owner").textContent = isOwner ? "Yes ✅" : "No ❌";
    document.getElementById("is-owner").style.color = isOwner ? "green" : "red";

    // Enable/Disable buttons
    document.getElementById("store-btn").disabled = !isOwner;
    document.getElementById("transfer-btn").disabled = !isOwner;

  } catch (err) {
    console.error("Load error:", err);
    alert("Error loading contract data. Is it verified?");
  }
}

// Functions
async function retrieve() {
  try {
    const value = await contract.retrieve();
    alert("retrieve() returned: " + value.toString());
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function callNumber() {
  // If your contract uses public var `number`, this calls it directly
  try {
    const value = await contract.number();
    alert("number (state var) = " + value.toString());
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function getOwner() {
  try {
    const owner = await contract.owner();
    alert("Current owner: " + owner);
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function getContractInfo() {
  try {
    const value = await contract.retrieve();
    const owner = await contract.owner();
    alert(`Contract Info:\nValue: ${value}\nOwner: ${owner}`);
  } catch (err) {
    alert("Error: " + err.message);
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
    if (err.message.includes("user rejected")) {
      document.getElementById("status").innerText = "❌ User denied transaction.";
    } else {
      document.getElementById("status").innerText = "❌ Transaction failed: " + err.reason;
    }
    console.error(err);
  }
}

// Transfer Ownership
async function transferOwnership() {
  const input = document.getElementById("new-owner-input");
  const address = input.value.trim();

  if (!ethers.isAddress(address)) {
    alert("Invalid Ethereum address");
    return;
  }

  if (confirm(`Transfer ownership to ${address}? This cannot be undone!`)) {
    try {
      const tx = await contract.transferOwnership(address);
      document.getElementById("status").innerText = "⏳ Transfer pending...";
      await tx.wait();
      document.getElementById("status").innerText = "✅ Ownership transferred!";
      await loadContractData(await signer.getAddress());
      input.value = "";
    } catch (err) {
      document.getElementById("status").innerText = "❌ Transfer failed: " + err.reason;
      console.error(err);
    }
  }
}

// Load Events
async function loadEvents() {
  try {
    const filter = contract.filters.NumberStored();
    const logs = await contract.queryFilter(filter, -100); // last 100 blocks

    const list = document.getElementById("events-list");
    list.innerHTML = "";

    if (logs.length === 0) {
      list.innerHTML = "<li>No recent events found.</li>";
      return;
    }

    logs.reverse(); // newest first
    logs.forEach(log => {
      const num = log.args[0].toString();
      const txHash = log.transactionHash;
      const li = document.createElement("li");
      li.innerHTML = `Value stored: <b>${num}</b> 
        <a href="https://sepolia-explorer.giwa.io/tx/${txHash}" target="_blank" style="float:right;">🔍</a>`;
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Event load error:", err);
    alert("Could not load events: " + err.message);
  }
}

// Disconnect Wallet
function disconnectWallet() {
  window.location.reload();
}

// Initialize on load
window.onload = init;
