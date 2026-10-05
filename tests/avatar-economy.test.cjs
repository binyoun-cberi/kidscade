const {test}=require('node:test');
const assert=require('node:assert/strict');
const economy=require('../app/features/avatar/avatar-economy.js');

test('global avatar price sequence is capped at 1300 regardless of category',()=>{
  assert.deepEqual([...economy.PRICE_STEPS],[100,200,300,500,800,1300]);
  assert.equal(economy.PRICE_CAP,1300);
  assert.deepEqual([0,1,2,3,4,5,6,20].map(economy.priceForPurchaseCount),[100,200,300,500,800,1300,1300,1300]);
});

test('default assets are free and any locked category shares the same next global price',()=>{
  let owned={};
  assert.deepEqual(economy.quote(owned,0,'hair','basic','basic'),{category:'hair',id:'basic',defaultId:'basic',free:true,owned:true,price:0});
  assert.equal(economy.quote(owned,0,'hair','short','basic').price,100);
  assert.equal(economy.quote(owned,0,'eyes','anime','basic-eyes').price,100);
  owned=economy.addOwned(owned,'hair','short','basic');
  assert.equal(economy.isOwned(owned,'hair','short','basic'),true);
  assert.equal(economy.quote(owned,1,'eyes','anime','basic-eyes').price,200);
  owned=economy.addOwned(owned,'eyes','anime','basic-eyes');
  assert.equal(economy.quote(owned,2,'upper','hoodie','uniform').price,300);
  assert.equal(economy.quote(owned,5,'hairColor','mint','brown').price,1300);
  assert.equal(economy.quote(owned,99,'hat','santa','no-hat').price,1300);
});

test('grandfathered ownership can exist without advancing the purchase counter',()=>{
  let owned=economy.addOwned({},'hair','short','basic');
  owned=economy.addOwned(owned,'upper','hoodie','uniform');
  assert.equal(economy.isOwned(owned,'hair','short','basic'),true);
  assert.equal(economy.isOwned(owned,'upper','hoodie','uniform'),true);
  assert.equal(economy.nextPrice(0),100);
  assert.equal(economy.normalizePurchaseCount(-8),0);
});
