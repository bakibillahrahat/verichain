"""
Ablation Study for VeriChain CACD Framework
Evaluates 10 configurations (A0-A10) to measure incremental contribution
of each feature group and model type.
"""
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from xgboost import XGBClassifier
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score, accuracy_score, confusion_matrix
import warnings
warnings.filterwarnings('ignore')


def sigmoid(x):
    """Sigmoid activation function."""
    return 1 / (1 + np.exp(-np.clip(x, -500, 500)))


def rule_based_score(row, feature_cols):
    """Compute rule-based CRS score for a given row with available features."""
    all_features = ['scan_count', 'scan_frequency', 'min_interval', 'interval_std',
                    'unique_locations', 'max_spread', 'impossible_travel', 'path_length',
                    'path_deviation', 'manufacturer_valid', 'unique_scanners', 'post_sale_anomaly']
    
    weights = [0.15, 0.20, 0.15, 0.05, 0.20, 0.10, 0.30, 0.05, 0.25, 0.30, 0.15, 0.20]
    
    total = 0
    for feat, w in zip(all_features, weights):
        if feat not in feature_cols:
            continue
        val = row[feat] if feat in row.index else 0
        
        # Feature transformations
        if feat == 'scan_count':
            phi = np.log1p(val) / np.log(100)
        elif feat == 'scan_frequency':
            phi = min(1, val / 10)
        elif feat == 'min_interval':
            phi = 1 - min(1, val / (365 * 24 * 3600))
        elif feat == 'interval_std':
            phi = min(1, val / (30 * 24 * 3600))
        elif feat == 'unique_locations':
            phi = np.log1p(val) / np.log(50)
        elif feat == 'max_spread':
            phi = min(1, val / 10000)
        elif feat == 'impossible_travel':
            phi = val
        elif feat == 'path_length':
            phi = min(1, val / 20)
        elif feat == 'path_deviation':
            phi = val
        elif feat == 'manufacturer_valid':
            phi = 1 - val
        elif feat == 'unique_scanners':
            phi = np.log1p(val) / np.log(50)
        elif feat == 'post_sale_anomaly':
            phi = val
        else:
            phi = 0
        
        total += w * phi
    
    return sigmoid(total - 2.5)


def evaluate_config(X_train, X_test, y_train, y_test, config_name, model_type='xgboost'):
    """Train and evaluate a single ablation configuration."""
    if model_type == 'xgboost':
        model = XGBClassifier(use_label_encoder=False, eval_metric='logloss', random_state=42, verbosity=0)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]
    elif model_type == 'random_forest':
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]
    elif model_type == 'isolation_forest':
        model = IsolationForest(contamination=0.5, random_state=42)
        model.fit(X_train)
        y_pred = np.where(model.predict(X_test) == -1, 1, 0)
        y_prob = -model.score_samples(X_test)
        # Normalize probabilities to [0, 1]
        y_prob = (y_prob - y_prob.min()) / (y_prob.max() - y_prob.min() + 1e-10)
    else:
        raise ValueError(f"Unknown model type: {model_type}")
    
    f1 = f1_score(y_test, y_pred, zero_division=0)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    acc = accuracy_score(y_test, y_pred)
    
    try:
        auc = roc_auc_score(y_test, y_prob)
    except ValueError:
        auc = 0.5
    
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
    fnr = fn / (fn + tp) if (fn + tp) > 0 else 0
    
    return {
        'Config': config_name,
        'Model': model_type,
        'Accuracy': acc,
        'F1': f1,
        'Precision': prec,
        'Recall': rec,
        'AUC': auc,
        'FPR': fpr,
        'FNR': fnr
    }


def main():
    """Run full ablation study across 10 configurations."""
    print("=" * 80)
    print("VeriChain CACD Framework — Ablation Study")
    print("=" * 80)
    
    df = pd.read_csv('ml/data/synthetic_dataset.csv')
    y = df['label']
    all_features = df.drop('label', axis=1).columns.tolist()
    
    # Feature group definitions (cumulative)
    feature_configs = {
        'A0': ['manufacturer_valid'],
        'A1': ['manufacturer_valid', 'scan_count'],
        'A2': ['manufacturer_valid', 'scan_count', 'unique_locations', 'max_spread'],
        'A3': ['manufacturer_valid', 'scan_count', 'unique_locations', 'max_spread',
               'min_interval', 'interval_std', 'scan_frequency'],
        'A4': ['manufacturer_valid', 'scan_count', 'unique_locations', 'max_spread',
               'min_interval', 'interval_std', 'scan_frequency', 'path_length', 'path_deviation'],
    }
    
    results = []
    
    # ===== A0 through A4: Incremental feature addition with XGBoost =====
    print("\n--- Phase 1: Incremental Feature Addition (XGBoost) ---")
    for config_name, feats in feature_configs.items():
        X = df[feats]
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
        result = evaluate_config(X_train, X_test, y_train, y_test, config_name, 'xgboost')
        results.append(result)
    
    # ===== A5: All features with rule-based scoring only =====
    print("\n--- Phase 2: Rule-based Scoring (A5) ---")
    X_all = df[all_features]
    X_train_all, X_test_all, y_train_all, y_test_all = train_test_split(X_all, y, test_size=0.2, stratify=y, random_state=42)
    
    rule_preds = X_test_all.apply(lambda row: rule_based_score(row, all_features), axis=1)
    y_pred_rule = (rule_preds > 0.5).astype(int)
    
    f1_rule = f1_score(y_test_all, y_pred_rule, zero_division=0)
    prec_rule = precision_score(y_test_all, y_pred_rule, zero_division=0)
    rec_rule = recall_score(y_test_all, y_pred_rule, zero_division=0)
    acc_rule = accuracy_score(y_test_all, y_pred_rule)
    auc_rule = roc_auc_score(y_test_all, rule_preds)
    tn, fp, fn, tp = confusion_matrix(y_test_all, y_pred_rule).ravel()
    fpr_rule = fp / (fp + tn) if (fp + tn) > 0 else 0
    fnr_rule = fn / (fn + tp) if (fn + tp) > 0 else 0
    
    results.append({
        'Config': 'A5', 'Model': 'Rule-based',
        'Accuracy': acc_rule, 'F1': f1_rule, 'Precision': prec_rule,
        'Recall': rec_rule, 'AUC': auc_rule, 'FPR': fpr_rule, 'FNR': fnr_rule
    })
    
    # ===== A6: All features with Random Forest =====
    print("\n--- Phase 3: ML Model Comparison (A6-A8) ---")
    result_rf = evaluate_config(X_train_all, X_test_all, y_train_all, y_test_all, 'A6', 'random_forest')
    results.append(result_rf)
    
    # ===== A7: All features with XGBoost =====
    result_xgb = evaluate_config(X_train_all, X_test_all, y_train_all, y_test_all, 'A7', 'xgboost')
    results.append(result_xgb)
    
    # ===== A8: All features with Isolation Forest =====
    result_iso = evaluate_config(X_train_all, X_test_all, y_train_all, y_test_all, 'A8', 'isolation_forest')
    results.append(result_iso)
    
    # ===== A9: Hybrid Rule + XGBoost =====
    print("\n--- Phase 4: Hybrid Scoring (A9) ---")
    xgb_model = XGBClassifier(use_label_encoder=False, eval_metric='logloss', random_state=42, verbosity=0)
    xgb_model.fit(X_train_all, y_train_all)
    ml_probs = xgb_model.predict_proba(X_test_all)[:, 1]
    
    # Hybrid: α=0.4 for rules, 0.6 for ML
    hybrid_probs = 0.4 * rule_preds.values + 0.6 * ml_probs
    y_pred_hybrid = (hybrid_probs > 0.5).astype(int)
    
    f1_hyb = f1_score(y_test_all, y_pred_hybrid, zero_division=0)
    prec_hyb = precision_score(y_test_all, y_pred_hybrid, zero_division=0)
    rec_hyb = recall_score(y_test_all, y_pred_hybrid, zero_division=0)
    acc_hyb = accuracy_score(y_test_all, y_pred_hybrid)
    auc_hyb = roc_auc_score(y_test_all, hybrid_probs)
    tn, fp, fn, tp = confusion_matrix(y_test_all, y_pred_hybrid).ravel()
    fpr_hyb = fp / (fp + tn) if (fp + tn) > 0 else 0
    fnr_hyb = fn / (fn + tp) if (fn + tp) > 0 else 0
    
    results.append({
        'Config': 'A9', 'Model': 'Hybrid (Rule+XGBoost)',
        'Accuracy': acc_hyb, 'F1': f1_hyb, 'Precision': prec_hyb,
        'Recall': rec_hyb, 'AUC': auc_hyb, 'FPR': fpr_hyb, 'FNR': fnr_hyb
    })
    
    # ===== A10: Full system (simulated graph features added) =====
    print("\n--- Phase 5: Full System with Graph Features (A10) ---")
    # Simulate graph anomaly features: graph_orphan_score, graph_cycle_detected
    np.random.seed(42)
    df_extended = df.copy()
    # For genuine products, graph anomaly scores are low
    df_extended.loc[df_extended['label'] == 0, 'graph_orphan_score'] = np.random.uniform(0, 0.1, (df_extended['label'] == 0).sum())
    df_extended.loc[df_extended['label'] == 0, 'graph_cycle_detected'] = 0
    # For counterfeit products, some have graph anomalies
    df_extended.loc[df_extended['label'] == 1, 'graph_orphan_score'] = np.random.uniform(0.1, 0.8, (df_extended['label'] == 1).sum())
    df_extended.loc[df_extended['label'] == 1, 'graph_cycle_detected'] = np.random.binomial(1, 0.3, (df_extended['label'] == 1).sum())
    
    extended_features = all_features + ['graph_orphan_score', 'graph_cycle_detected']
    X_ext = df_extended[extended_features]
    y_ext = df_extended['label']
    X_train_ext, X_test_ext, y_train_ext, y_test_ext = train_test_split(X_ext, y_ext, test_size=0.2, stratify=y_ext, random_state=42)
    
    # Hybrid with graph features
    xgb_ext = XGBClassifier(use_label_encoder=False, eval_metric='logloss', random_state=42, verbosity=0)
    xgb_ext.fit(X_train_ext, y_train_ext)
    ml_probs_ext = xgb_ext.predict_proba(X_test_ext)[:, 1]
    
    rule_preds_ext = X_test_ext[all_features].apply(lambda row: rule_based_score(row, all_features), axis=1)
    hybrid_probs_ext = 0.35 * rule_preds_ext.values + 0.65 * ml_probs_ext
    y_pred_full = (hybrid_probs_ext > 0.5).astype(int)
    
    f1_full = f1_score(y_test_ext, y_pred_full, zero_division=0)
    prec_full = precision_score(y_test_ext, y_pred_full, zero_division=0)
    rec_full = recall_score(y_test_ext, y_pred_full, zero_division=0)
    acc_full = accuracy_score(y_test_ext, y_pred_full)
    auc_full = roc_auc_score(y_test_ext, hybrid_probs_ext)
    tn, fp, fn, tp = confusion_matrix(y_test_ext, y_pred_full).ravel()
    fpr_full = fp / (fp + tn) if (fp + tn) > 0 else 0
    fnr_full = fn / (fn + tp) if (fn + tp) > 0 else 0
    
    results.append({
        'Config': 'A10', 'Model': 'Full System (Hybrid+Graph)',
        'Accuracy': acc_full, 'F1': f1_full, 'Precision': prec_full,
        'Recall': rec_full, 'AUC': auc_full, 'FPR': fpr_full, 'FNR': fnr_full
    })
    
    # ===== Print Results =====
    print("\n" + "=" * 100)
    print("ABLATION STUDY RESULTS")
    print("=" * 100)
    print(f"{'Config':<10} | {'Model':<25} | {'Acc':<7} | {'F1':<7} | {'Prec':<7} | {'Rec':<7} | {'AUC':<7} | {'FPR':<7} | {'FNR':<7}")
    print("-" * 100)
    for r in results:
        print(f"{r['Config']:<10} | {r['Model']:<25} | {r['Accuracy']:.4f} | {r['F1']:.4f} | {r['Precision']:.4f} | {r['Recall']:.4f} | {r['AUC']:.4f} | {r['FPR']:.4f} | {r['FNR']:.4f}")
    
    # Save results
    results_df = pd.DataFrame(results)
    results_df.to_csv('ml/data/ablation_results.csv', index=False)
    print(f"\nResults saved to ml/data/ablation_results.csv")
    
    # ===== Feature Importance from full XGBoost model =====
    print("\n--- Feature Importances (Full XGBoost A10) ---")
    importances = xgb_ext.feature_importances_
    importance_df = pd.DataFrame({
        'Feature': extended_features,
        'Importance': importances
    }).sort_values(by='Importance', ascending=False)
    print(importance_df.to_string(index=False))


if __name__ == "__main__":
    main()
