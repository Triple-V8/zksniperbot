import { ethers } from "ethers";
const mnemonic = "";
const receiverAddress = "0xD9407dda6709c5d0838C61fB4E73e8d06995552a"
const contractAddress = " ";
const amount = "0.05" //in ether

//For zksync, syncswap
const addresses = {
    WETH: '0x5aea5775959fbc2557cc8789bc1bf90a239d9a91',
    factory: '0xf2DAd89f2788a8CD54625C60b55cD3d2D0ACa7Cb',
    router: '0x2da10A1e27bF85cEdD8FFb1AbBe97e53391C0295',
    recipient: receiverAddress
  }


const provider = new ethers.WebSocketProvider("wss://mainnet.era.zksync.io/ws");
console.log("Provider ", provider)
const wallet = ethers.Wallet.fromPhrase(mnemonic);
const account = wallet.connect(provider);
  
const factory = new ethers.Contract(
    addresses.factory,
    ['event PairCreated(address indexed token0, address indexed token1, address pair, uint)'],
    account
  );
  console.log("1 ");
const router = new ethers.Contract(
    addresses.router,
    [
      'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
      'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
    ],
    account
  );
  console.log("2 ")
const WETH = new ethers.Contract(
    addresses.WETH,
    [
      'function approve(address spender, uint amount) public returns(bool)',
    ],
    account
  );
  //Step 3: Set up the parameters
  
factory.on('PairCreated', async (token0, token1, pairAddress) => {
    console.log(`
      New pair detected
      =================
      token0: ${token0}
      token1: ${token1}
      pairAddress: ${pairAddress}
    `);
  
//The quote currency needs to be WETH (we will pay with WETH)
    let tokenIn, tokenOut;
    if(token0 === addresses.WETH) {
      tokenIn = token0; 
      tokenOut = token1;
    }
  
    if(token1 == addresses.WETH) {
      tokenIn = token1; 
      tokenOut = token0;
    }
  
    //The quote currency is not WETH
    if(typeof tokenIn === 'undefined') {
      return;
    }

  
    //We buy for 0.1 BNB of the new token
    //ethers was originally created for Ethereum, both also work for BSC
    //'ether' === 'bnb' on BSC
    const amountIn = ethers.utils.parseUnits(amount, 'ether');
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    //Our execution price will be a bit different, we need some flexbility
    const amountOutMin = amounts[1].sub(amounts[1].div(10));
    console.log(`
      Buying new token
      =================
      tokenIn: ${amountIn.toString()} ${tokenIn} (WETH)
      tokenOut: ${amountOutMin.toString()} ${tokenOut}
    `);
    const tx = await router.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      [tokenIn, tokenOut],
      addresses.recipient,
      Date.now() + 1000 * 60 * 10 //10 minutes
    );
    const receipt = await tx.wait(); 
    console.log('Transaction receipt');
    console.log(receipt);
  });