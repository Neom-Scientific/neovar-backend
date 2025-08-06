
// // generates a unique project ID based on the current date and a counter
// export function generateProjectId(counter=null) {
//     const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  
//     let seq;
//     if (counter !== null) {
//       counter += 1;
//       seq = String(counter).padStart(2, '0');
//     }
//     else {
//       counter = 1;
//       seq = String(counter).padStart(2, '0');
//     }
//     return `PRJ-${date}-${seq}`;
//   }

// Generates a unique project ID based on the current date and a counter
function generateProjectId(counter = null) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  let seq;
  if (counter !== null) {
    counter += 1;
    seq = String(counter).padStart(2, '0');
  } else {
    counter = 1;
    seq = String(counter).padStart(2, '0');
  }
  return `PRJ-${date}-${seq}`;
}

module.exports = { generateProjectId };