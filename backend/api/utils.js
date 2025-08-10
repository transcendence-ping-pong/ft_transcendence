
function splitIntoRandomPairs(inputArray) {
  if (inputArray.length !== 8) {
    throw new Error("Input array must contain exactly 8 elements.");
  }

  // Shuffle the array using Fisher-Yates algorithm
  const copyArray = [...inputArray]
  for (let i = copyArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copyArray[i], copyArray[j]] = [copyArray[j], copyArray[i]];
  }

  // Split into 4 arrays of 2 elements each
  const result = [];
  for (let i = 0; i < 8; i += 2) {
    result.push([copyArray[i], copyArray[i + 1]]);
  }

  return result;
};

module.exports = {
  splitIntoRandomPairs,
};