const { PrismaClient } = require('../prisma/generated/client');
const fs = require('fs');
const path = require('path');
require('dotenv/config');

async function exportConversations() {
  const prisma = new PrismaClient();
  
  try {
    console.log('📊 Exporting all conversation entries...');
    
    // Connect to database
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Get all conversations
    const conversations = await prisma.conversation.findMany({
      orderBy: {
        id: 'asc'
      }
    });
    
    console.log(`📋 Found ${conversations.length} conversation entries`);
    
    // Create export data with metadata
    const exportData = {
      exportDate: new Date().toISOString(),
      totalEntries: conversations.length,
      conversations: conversations
    };
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `conversations-export-${timestamp}.json`;
    const filepath = path.join(__dirname, filename);
    
    // Write to file
    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
    
    console.log(`✅ Export completed successfully!`);
    console.log(`📁 File saved: ${filepath}`);
    console.log(`📊 Total entries exported: ${conversations.length}`);
    
    // Show some statistics
    if (conversations.length > 0) {
      const firstEntry = conversations[0];
      const lastEntry = conversations[conversations.length - 1];
      
      console.log('\n📈 Export Statistics:');
      console.log(`   First Entry ID: ${firstEntry.id}`);
      console.log(`   Last Entry ID: ${lastEntry.id}`);
      console.log(`   Date Range: ${firstEntry.id} - ${lastEntry.id}`);
      
      // Show sample entries
      console.log('\n📝 Sample Entries:');
      conversations.slice(0, 3).forEach((entry, index) => {
        console.log(`\n   ${index + 1}. Entry ID: ${entry.id}`);
        console.log(`      Prompt: ${entry.prompt.substring(0, 80)}${entry.prompt.length > 80 ? '...' : ''}`);
        console.log(`      Response: ${entry.response.substring(0, 80)}${entry.response.length > 80 ? '...' : ''}`);
      });
      
      if (conversations.length > 3) {
        console.log(`\n   ... and ${conversations.length - 3} more entries`);
      }
    }
    
  } catch (error) {
    console.error('❌ Export failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportConversations(); 