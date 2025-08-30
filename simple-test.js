// Простой тест edge-js
const edge = require('edge-js');

const testFunc = edge.func(`
    using System;
    using System.Threading.Tasks;
    
    public class Startup
    {
        public async Task<object> Invoke(object input)
        {
            return new { success = true, message = "Hello from C#!" };
        }
    }
`);

function testSimple() {
    try {
        console.log('Testing simple edge-js function...');
        testFunc(null, function(error, result) {
            if (error) {
                console.error('Error:', error);
            } else {
                console.log('Result:', result);
            }
        });
    } catch (error) {
        console.error('Sync Error:', error);
    }
}

testSimple();