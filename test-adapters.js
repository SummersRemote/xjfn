#!/usr/bin/env node

/**
 * Simple test to verify Phase 5 adapter integration
 */

const { XJFN } = require('./dist/index.js');

console.log('🚀 Testing Phase 5 Adapter Integration...\n');

try {
  // Test XML Adapter
  console.log('📄 Testing XML Adapter...');
  const xmlInput = '<books><book id="1"><title>Test Book</title><price>29.99</price></book></books>';
  
  const xmlTest = new XJFN()
    .fromXml(xmlInput)
    .toJson();
  
  console.log('✅ XML → JSON conversion successful');
  console.log('   Input:', xmlInput);
  console.log('   Output:', JSON.stringify(xmlTest, null, 2));
  
  // Test JSON Adapter
  console.log('\n📊 Testing JSON Adapter...');
  const jsonInput = { 
    books: { 
      book: { 
        "@id": "1", 
        title: "Test Book", 
        price: 29.99 
      } 
    } 
  };
  
  const jsonTest = new XJFN()
    .fromJson(jsonInput)
    .toXmlString();
  
  console.log('✅ JSON → XML conversion successful');
  console.log('   Input:', JSON.stringify(jsonInput, null, 2));
  console.log('   Output:', jsonTest);
  
  // Test XNode Adapter
  console.log('\n🔄 Testing XNode Adapter (Round-trip)...');
  const roundTripTest = new XJFN()
    .fromXml(xmlInput);
  
  const serialized = roundTripTest.toXNodeString(2);
  console.log('✅ XNode serialization successful');
  
  const backToXml = new XJFN()
    .fromXNode(serialized)
    .toXmlString();
  
  console.log('✅ XNode round-trip conversion successful');
  console.log('   Original:', xmlInput);
  console.log('   Restored:', backToXml);
  
  // Test Functional Operations with Adapters
  console.log('\n⚙️ Testing Functional Operations Integration...');
  const functionalTest = new XJFN()
    .fromXml('<products><product active="true"><name>Widget</name><price>10</price></product><product active="false"><name>Gadget</name><price>20</price></product></products>')
    .filter(node => node.name === 'product' && node.attributes?.some(attr => attr.name === 'active' && attr.value === 'true'))
    .map(node => node.name === 'price' ? { ...node, value: Number(node.value) * 1.1 } : node)
    .toJson();
  
  console.log('✅ Functional operations with adapters successful');
  console.log('   Result:', JSON.stringify(functionalTest, null, 2));
  
  console.log('\n🎉 All Phase 5 Adapter Integration Tests Passed!');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}