function calculateSimilarity(text1, text2) {
  const a = text1.toLowerCase().split(/\s+/);
  const b = text2.toLowerCase().split(/\s+/);
  const setA = new Set(a);
  const setB = new Set(b);

  const intersection = new Set([...setA].filter((word) => setB.has(word)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

function isNearby(loc1, loc2, thresholdMeters = 200) {
  if (!loc1 || !loc2 || !loc1.lat || !loc2.lat) return false;

  const R = 6371000;
  const dLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const dLng = ((loc2.lng - loc1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((loc1.lat * Math.PI) / 180) *
      Math.cos((loc2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance <= thresholdMeters;
}

module.exports = { calculateSimilarity, isNearby };