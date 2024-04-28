const Web3 = require("web3");
const ABI_POOL_V3 = require("./ABI/ABI_POOL_V3.json");
const config = require("./config.json");

const web3 = new Web3("https://base.publicnode.com");
const contractPoolETHUSDC = new web3.eth.Contract(
  ABI_POOL_V3,
  config.POOL_ETH_USDC_ADDRESS
);

async function getETHPrice() {
  const slot = await contractPoolETHUSDC.methods.slot0().call();
  const sqrtPriceX96 = slot.sqrtPriceX96;
  const price = parseInt(sqrtPriceX96) ** 2 / 2 ** 192; // Convert sqrt price to actual price

  return price * 10 ** 12;
}

const transferETH = async () => {
  try {
    const account = web3.eth.accounts.privateKeyToAccount(config.PRIVATE_KEY);
    const balance = await web3.eth.getBalance(account.address);
    const gasPrice = await web3.eth.getGasPrice();
    const gasLimit = 200_000; // Giới hạn gas

    const subtractAmountWei = web3.utils.toWei("0.002", "ether"); // fee gas

    // Tính toán phí gas ước lượng
    const gasCost = web3.utils.toBN(gasPrice).mul(web3.utils.toBN(gasLimit));

    // Tính số dư có thể chuyển sau khi trừ phí gas
    const valueWei = web3.utils
      .toBN(balance)
      .sub(gasCost)
      .sub(web3.utils.toBN(subtractAmountWei));

    if (valueWei.isNeg()) {
      throw new Error("Insufficient funds to cover the gas cost");
    }

    console.log("Balance:", balance, "Value:", valueWei.toString());

    const txObject = {
      from: account.address,
      to: config.RECIEPT_WALLET,
      gasPrice: gasPrice,
      gasLimit: gasLimit,
      value: valueWei.toString(),
      // nonce: 1,
    };

    const feeGas = await web3.eth.estimateGas(txObject);

    const signedTx = await web3.eth.accounts.signTransaction(
      txObject,
      account.privateKey
    );
    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );
    console.log("Transfer ETH");
  } catch (e) {
    console.log("Error: ", e);
  }
};

async function runBot() {
  try {
    let priceETH = await getETHPrice();
    if (priceETH > config.TRIGGER_PRICE) {
      await transferETH();
    }
    await runBot();
  } catch (e) {
    console.log(e);
  }
}

runBot();
