const generateUniqueCode = () => {
  // Generate 3 digit random (100-999)
  return Math.floor(Math.random() * 900) + 100;
};

module.exports = generateUniqueCode;