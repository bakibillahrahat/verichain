import os
import pandas as pd
import numpy as np

os.environ['MPLCONFIGDIR'] = '/tmp/matplotlib'
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

os.makedirs('figures', exist_ok=True)

plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.size'] = 10
plt.rcParams['axes.labelsize'] = 11
plt.rcParams['axes.titlesize'] = 12
plt.rcParams['xtick.labelsize'] = 9.5
plt.rcParams['ytick.labelsize'] = 9.5
plt.rcParams['legend.fontsize'] = 9.5
plt.rcParams['figure.titlesize'] = 12

# Figure 3: Accuracy and F1-score for Base Models
df_base = pd.read_csv('ml/data/model_comparison.csv')
models = ['Random Forest', 'Gradient Boosting', 'Isolation Forest']
short_names = ['RF', 'GB', 'IF']

acc_scores = [df_base[df_base['Model'] == m]['Accuracy'].values[0] * 100 for m in models]
f1_scores = [df_base[df_base['Model'] == m]['F1'].values[0] * 100 for m in models]

x = np.arange(len(short_names))
width = 0.32

fig, ax = plt.subplots(figsize=(5, 3.6), dpi=300)
bars_acc = ax.bar(x - width/2, acc_scores, width, label='Accuracy', color='#1f77b4', edgecolor='black', linewidth=0.8)
bars_f1 = ax.bar(x + width/2, f1_scores, width, label='F1-score', color='#2ca02c', edgecolor='black', linewidth=0.8)

ax.set_ylabel('Performance (%)', fontweight='bold')
ax.set_xticks(x)
ax.set_xticklabels(['Random\nForest (RF)', 'Gradient\nBoosting (GB)', 'Isolation\nForest (IF)'])
ax.set_ylim(85, 102)
ax.legend(loc='upper right', framealpha=0.9)
ax.grid(axis='y', linestyle='--', alpha=0.5)

for bar in bars_acc:
    h = bar.get_height()
    ax.annotate(f'{h:.2f}%',
                xy=(bar.get_x() + bar.get_width() / 2, h),
                xytext=(0, 3), textcoords="offset points",
                ha='center', va='bottom', fontsize=8.5, fontweight='bold')

for bar in bars_f1:
    h = bar.get_height()
    ax.annotate(f'{h:.2f}%',
                xy=(bar.get_x() + bar.get_width() / 2, h),
                xytext=(0, 3), textcoords="offset points",
                ha='center', va='bottom', fontsize=8.5, fontweight='bold')

plt.tight_layout()
fig.savefig('figures/figure3.png', dpi=300)
plt.close(fig)
print("Saved figures/figure3.png")

# Figure 4: F1-score across A0--A10 Configurations
df_abl = pd.read_csv('ml/data/ablation_results.csv')
configs = df_abl['Config'].tolist()
f1_abl = (df_abl['F1'] * 100).tolist()

fig, ax = plt.subplots(figsize=(6.5, 3.6), dpi=300)

colors = ['#1f77b4' if i <= 4 else '#ff7f0e' if i == 5 else '#2ca02c' if i <= 8 else '#9467bd' if i == 9 else '#d62728' for i in range(len(configs))]

bars = ax.bar(configs, f1_abl, color=colors, edgecolor='black', linewidth=0.8, width=0.65)
ax.set_xlabel('Ablation Configuration', fontweight='bold')
ax.set_ylabel('F1-score (%)', fontweight='bold')
ax.set_ylim(0, 115)
ax.grid(axis='y', linestyle='--', alpha=0.5)

for bar, val in zip(bars, f1_abl):
    ax.annotate(f'{val:.1f}%',
                xy=(bar.get_x() + bar.get_width() / 2, val),
                xytext=(0, 3), textcoords="offset points",
                ha='center', va='bottom', fontsize=7.5, fontweight='bold')

ax.axvline(x=4.5, color='gray', linestyle=':', linewidth=1)
ax.axvline(x=5.5, color='gray', linestyle=':', linewidth=1)
ax.axvline(x=8.5, color='gray', linestyle=':', linewidth=1)
ax.axvline(x=9.5, color='gray', linestyle=':', linewidth=1)

ax.text(2, 107, 'Feature Incr.', ha='center', fontsize=7.5, fontstyle='italic')
ax.text(5, 107, 'Rule', ha='center', fontsize=7.5, fontstyle='italic')
ax.text(7, 107, 'ML Models', ha='center', fontsize=7.5, fontstyle='italic')
ax.text(9, 107, 'Hybrid', ha='center', fontsize=7.5, fontstyle='italic')
ax.text(10, 107, 'Graph', ha='center', fontsize=7.5, fontstyle='italic')

plt.tight_layout()
fig.savefig('figures/figure4.png', dpi=300)
plt.close(fig)
print("Saved figures/figure4.png")
