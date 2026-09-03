/**
 * Counterfeit Risk Scoring (CRS) Engine
 * Implements context-aware anomaly scoring on supply-chain and scan events.
 */

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function computeCrsScore(features, mlScore = null, alpha = 0.4) {
  const f1 = features.f1 || features.scan_count || 0;
  const f2 = features.f2 || features.scan_frequency || 0;
  const f3 = features.f3 !== undefined ? features.f3 : (features.min_interval !== undefined ? features.min_interval : 86400);
  const f4 = features.f4 || features.interval_std || 0;
  const f5 = features.f5 || features.unique_locations || 1;
  const f6 = features.f6 || features.max_spread || 0;
  const f7 = features.f7 !== undefined ? features.f7 : (features.impossible_travel ? 1 : 0);
  const f8 = features.f8 || features.path_length || 3;
  const f9 = features.f9 !== undefined ? features.f9 : (features.path_deviation ? 1 : 0);
  const f10 = features.f10 !== undefined ? features.f10 : (features.manufacturer_valid !== undefined ? features.manufacturer_valid : 1);
  const f11 = features.f11 || features.unique_scanners || 1;
  const f12 = features.f12 !== undefined ? features.f12 : (features.post_sale_anomaly ? 1 : 0);

  // Normalized feature transformations
  const phi1 = Math.min(1.0, Math.max(0.0, (f1 - 2) / 10.0));
  const phi2 = Math.min(1.0, f2 / 2.0);
  const phi3 = Math.exp(-Math.max(0, f3) / 7200.0); // High risk if scanned within 2 hours
  const phi4 = Math.min(1.0, f4 / 10000.0);
  const phi5 = Math.min(1.0, Math.max(0.0, (f5 - 1) / 5.0));
  const phi6 = Math.min(1.0, f6 / 500.0);
  const phi7 = Number(f7);
  const phi8 = Math.min(1.0, f8 / 10.0);
  const phi9 = Number(f9);
  const phi10 = Number(1.0 - f10);
  const phi11 = Math.min(1.0, Math.max(0.0, (f11 - 1) / 5.0));
  const phi12 = Number(f12);

  const weights = [0.10, 0.10, 0.12, 0.05, 0.12, 0.08, 0.15, 0.03, 0.12, 0.15, 0.10, 0.12];
  const phis = [phi1, phi2, phi3, phi4, phi5, phi6, phi7, phi8, phi9, phi10, phi11, phi12];

  let rawScore = 0;
  for (let i = 0; i < weights.length; i++) {
    rawScore += weights[i] * phis[i];
  }

  // Map raw weighted sum into [0, 1] calibrated risk score
  const ruleScore = Math.min(1.0, Math.max(0.0, rawScore * 2.2));

  if (mlScore !== null) {
    return (alpha * ruleScore) + ((1 - alpha) * mlScore);
  }
  
  return ruleScore;
}

module.exports = { computeCrsScore };
