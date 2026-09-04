#!/usr/bin/env bash
# VeriChain ML Pipeline Runner
set -e

echo "=========================================================="
echo "          VERICHAIN: CACD ML EXPERIMENT RUNNER            "
echo "=========================================================="
echo ""

PYTHON="ml/venv/bin/python"

if [ ! -f "$PYTHON" ]; then
    echo "Virtual environment python not found at $PYTHON"
    exit 1
fi

echo "[Step 1/5] Generating Synthetic Dataset (4,000 samples)..."
$PYTHON ml/generate_data.py
echo ""

echo "[Step 2/5] Training Models (Random Forest, Gradient Boosting, Isolation Forest)..."
$PYTHON ml/train_models.py
echo ""

echo "[Step 3/5] Evaluating Baselines & CACD Hybrid Performance..."
$PYTHON ml/evaluate.py
echo ""

echo "[Step 4/5] Running 10-Configuration Ablation Study (A0 - A10)..."
$PYTHON ml/ablation.py
echo ""

echo "[Step 5/5] Generating Paper Publication Figures (figure3.png, figure4.png)..."
$PYTHON ml/plot_figures.py
echo ""

echo "=========================================================="
echo "ALL EXPERIMENTS COMPLETED SUCCESSFULLY!"
echo "Results saved in ml/data/ (model_comparison.csv, ablation_results.csv)"
echo "Figures saved in figures/ (figure3.png, figure4.png)"
echo "Paper tables and figures in main.tex are fully up to date!"
echo "=========================================================="

