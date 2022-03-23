/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-var-requires */
const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
require('@nomiclabs/hardhat-ethers')

const { getContractFactory, getSigners } = ethers

describe('ETHPool', async () => {
  let ETHPool;
  let owner;
  let Alice;
  let Bob;
  let team;

  const provider = waffle.provider;

  const toWEI = (eth) => ethers.utils.parseEther(eth)

  const poolBalance = async () => await provider.getBalance(ETHPool.address)

  const deposit = async (user, amount) => await ETHPool.connect(user).deposit({ value: toWEI(amount) })
  
  const depositRewards = async (team, amount) => await ETHPool.connect(team).depositRewards({ value: toWEI(amount) })

  beforeEach(async () => {
    [owner, team, Alice, Bob] = await getSigners();

    const ethpoolFactory = await getContractFactory('ETHPool', owner);
    ETHPool = await ethpoolFactory.deploy();
    await ETHPool.deployed();

    console.log("contract address: ", ETHPool.address)
    console.log("team's address: ", team.address)
    console.log("Alice's address: ", Alice.address)
    console.log("Bob's address: ", Bob.address)

    await ETHPool.connect(owner).setTeamMember(team.address);
  })

  it('Case 1. A, T, B deposits 10 ETH each, A, B withdraws', async () => {
    // Initial balance of pool is 0 ETH
    expect(await poolBalance()).to.equal(0)

    // A, T, B deposits 10 ETH each
    await deposit(Alice, "10")
    await depositRewards(team, "10")
    await deposit(Bob, "10")

    // Balance of pool is 30 ETH now
    expect(await poolBalance()).to.equal(toWEI("30"))

    // A's liquidity and rewards are 10 ETH each other, so total balance is 20 ETH
    expect(await ETHPool.getLiquidity(Alice.address)).to.equal(toWEI("10"))
    expect(await ETHPool.getRewards(Alice.address)).to.equal(toWEI("10"))
    expect(await ETHPool.getBalance(Alice.address)).to.equal(toWEI("20"))

    // B's liquidity is 10 ETH but rewards is 0 ETH, so total balance is 10 ETH
    expect(await ETHPool.getLiquidity(Bob.address)).to.equal(toWEI("10"))
    expect(await ETHPool.getRewards(Bob.address)).to.equal(0)
    expect(await ETHPool.getBalance(Bob.address)).to.equal(toWEI("10"))

    // If A withdraws, pool's balance becomes 10 ETH
    await ETHPool.connect(Alice).withdraw()
    expect(await poolBalance()).to.equal(toWEI("10"))

    // A's liquidity, rewards, balance is 0 ETH
    expect(await ETHPool.getLiquidity(Alice.address)).to.equal(0)
    expect(await ETHPool.getRewards(Alice.address)).to.equal(0)
    expect(await ETHPool.getBalance(Alice.address)).to.equal(0)

    // If B withdraws, pool's balance becomes 0 ETH
    await ETHPool.connect(Bob).withdraw()
    expect(await poolBalance()).to.equal(0)
  
    // B's liquidity, rewards, balance is 0 ETH
    expect(await ETHPool.getLiquidity(Bob.address)).to.equal(0)
    expect(await ETHPool.getRewards(Bob.address)).to.equal(0)
    expect(await ETHPool.getBalance(Bob.address)).to.equal(0)
  })

  it('Case 2. A, B, T deposits 10 ETH each, A, B withdraws', async () => {
    // Initial balance of pool is 0 ETH
    expect(await poolBalance()).to.equal(0)

    // A, B, T deposits 10 ETH each
    await deposit(Alice, "10")
    await deposit(Bob, "10")
    await depositRewards(team, "10")

    // Balance of pool is 30 ETH now
    expect(await poolBalance()).to.equal(toWEI("30"))

    // A's liquidity is 10 ETH and rewards is 5 ETH, so total balance is 15 ETH
    expect(await ETHPool.getLiquidity(Alice.address)).to.equal(toWEI("10"))
    expect(await ETHPool.getRewards(Alice.address)).to.equal(toWEI("5"))
    expect(await ETHPool.getBalance(Alice.address)).to.equal(toWEI("15"))

    // B's liquidity is 10 ETH and rewards is 5 ETH, so total balance is 15 ETH
    expect(await ETHPool.getLiquidity(Bob.address)).to.equal(toWEI("10"))
    expect(await ETHPool.getRewards(Bob.address)).to.equal(toWEI("5"))
    expect(await ETHPool.getBalance(Bob.address)).to.equal(toWEI("15"))

    // If A withdraws, pool's balance becomes 15 ETH
    await ETHPool.connect(Alice).withdraw()
    expect(await poolBalance()).to.equal(toWEI("15"))

    // A's liquidity, rewards, balance is 0 ETH
    expect(await ETHPool.getLiquidity(Alice.address)).to.equal(0)
    expect(await ETHPool.getRewards(Alice.address)).to.equal(0)
    expect(await ETHPool.getBalance(Alice.address)).to.equal(0)

    // If B withdraws, pool's balance becomes 0 ETH
    await ETHPool.connect(Bob).withdraw()
    expect(await poolBalance()).to.equal(0)

    // B's liquidity, rewards, balance is 0 ETH
    expect(await ETHPool.getLiquidity(Bob.address)).to.equal(0)
    expect(await ETHPool.getRewards(Bob.address)).to.equal(0)
    expect(await ETHPool.getBalance(Bob.address)).to.equal(0)
  })

  it('Case 3. A, B, T, A, T, B deposits 10 ETH each, A, B withdraws', async () => {
    // Initial balance of pool is 0 ETH
    expect(await poolBalance()).to.equal(0)

    // A, B, T, A, T, B deposits 10 ETH each
    await deposit(Alice, "10")
    await deposit(Bob, "10")
    await depositRewards(team, "10")
    await deposit(Alice, "10")

    await ETHPool.connect(owner).setLastTime(0);

    await depositRewards(team, "10")
    await deposit(Bob, "10")

    // Balance of pool is 60 ETH now
    expect(await poolBalance()).to.equal(toWEI("60"))

    // A's liquidity is 10 + 10 = 20 ETH and rewards is 5 + 10 * 2 / 3 = 11.66..6{18} ETH, so total balance is 31.66...6{18} ETH
    expect(await ETHPool.getLiquidity(Alice.address)).to.equal(toWEI("20.0"))
    expect(await ETHPool.getRewards(Alice.address)).to.equal(toWEI("11.666666666666666666"))
    expect(await ETHPool.getBalance(Alice.address)).to.equal(toWEI("31.666666666666666666"))

    // B's liquidity is 10 + 10 = 20 ETH and rewards is 5 + 10 * 1 / 3 = 8.33...3{18} ETH, so total balance is 28.33...3{18} ETH
    expect(await ETHPool.getLiquidity(Bob.address)).to.equal(toWEI("20.0"))
    expect(await ETHPool.getRewards(Bob.address)).to.equal(toWEI("8.333333333333333333"))
    expect(await ETHPool.getBalance(Bob.address)).to.equal(toWEI("28.333333333333333333"))

    // If A withdraws, pool's balance becomes 60 - 31.66...6{18} = 28.33...4{18} ETH
    await ETHPool.connect(Alice).withdraw()
    expect(await poolBalance()).to.equal(toWEI("28.333333333333333334"))

    // A's liquidity, rewards, balance is 0 ETH
    expect(await ETHPool.getLiquidity(Alice.address)).to.equal(0)
    expect(await ETHPool.getRewards(Alice.address)).to.equal(0)
    expect(await ETHPool.getBalance(Alice.address)).to.equal(0)

    // If B withdraws, pool's balance becomes 10 ** -18 ETH
    await ETHPool.connect(Bob).withdraw()
    expect(await poolBalance()).to.equal(toWEI("0.000000000000000001"))

    // B's liquidity, rewards, balance is 0 ETH
    expect(await ETHPool.getLiquidity(Bob.address)).to.equal(0)
    expect(await ETHPool.getRewards(Bob.address)).to.equal(0)
    expect(await ETHPool.getBalance(Bob.address)).to.equal(0)
  })
})