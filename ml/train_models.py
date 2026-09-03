import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, IsolationForest
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

def train_and_evaluate(model, X_train, X_test, y_train, y_test, name):
    if name == 'Isolation Forest':
        model.fit(X_train)
        y_pred = model.predict(X_test)
        y_pred = np.where(y_pred == -1, 1, 0)
        y_prob = -model.score_samples(X_test)
        y_prob = (y_prob - y_prob.min()) / (y_prob.max() - y_prob.min() + 1e-10)
    else:
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]
        
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    auc = roc_auc_score(y_test, y_prob)
    
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
    fnr = fn / (fn + tp) if (fn + tp) > 0 else 0
    
    print(f"\n--- {name} ---")
    print(f"Accuracy: {acc:.4f} | Precision: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f} | AUC: {auc:.4f}")
    print(f"FPR: {fpr:.4f} | FNR: {fnr:.4f}")
    
    os.makedirs('ml/models', exist_ok=True)
    joblib.dump(model, f'ml/models/{name.replace(" ", "_")}.pkl')
    
    return {'Model': name, 'Accuracy': acc, 'Precision': prec, 'Recall': rec, 'F1': f1, 'AUC': auc, 'FPR': fpr, 'FNR': fnr}

def main():
    if not os.path.exists('ml/data/synthetic_dataset.csv'):
        print("Dataset not found. Run generate_data.py first.")
        return
        
    df = pd.read_csv('ml/data/synthetic_dataset.csv')
    X = df.drop('label', axis=1)
    y = df['label']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    
    results = []
    
    # 1. Random Forest
    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    results.append(train_and_evaluate(rf, X_train, X_test, y_train, y_test, 'Random Forest'))
    
    # 2. Gradient Boosting (GBDT / XGBoost equivalent)
    gb = GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42)
    results.append(train_and_evaluate(gb, X_train, X_test, y_train, y_test, 'Gradient Boosting'))
    
    # Save a copy as XGBoost.pkl as well for compatibility with verify.js
    joblib.dump(gb, 'ml/models/XGBoost.pkl')
    
    # 3. Isolation Forest
    iso = IsolationForest(contamination=0.5, random_state=42)
    results.append(train_and_evaluate(iso, X_train, X_test, y_train, y_test, 'Isolation Forest'))

    # Feature importances
    importances = gb.feature_importances_
    features = X.columns
    importance_df = pd.DataFrame({'Feature': features, 'Importance': importances}).sort_values(by='Importance', ascending=False)
    print("\nFeature Importances (Gradient Boosting):")
    print(importance_df.to_string(index=False))
    
    # Save metrics summary
    summary_df = pd.DataFrame(results)
    summary_df.to_csv('ml/data/model_comparison.csv', index=False)
    print("\nModel evaluation summary saved to ml/data/model_comparison.csv")

if __name__ == "__main__":
    main()
