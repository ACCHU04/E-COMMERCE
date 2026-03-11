import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Set random seed for reproducibility
np.random.seed(42)

# Number of rows
n_rows = 1000

# Generate data
data = {
    'order_id': range(1, n_rows + 1),
    'order_date': [
        (datetime(2022, 1, 1) + timedelta(days=np.random.randint(0, 731))).strftime('%Y-%m-%d')
        for _ in range(n_rows)
    ],
    'product_id': np.random.randint(1000, 10000, n_rows),
    'product_category': np.random.choice(
        ['Books', 'Fashion', 'Electronics', 'Home', 'Sports', 'Beauty'],
        n_rows,
        p=[0.15, 0.20, 0.25, 0.15, 0.15, 0.10]  # Realistic distribution
    ),
    'price': np.round(np.random.uniform(10.00, 500.00, n_rows), 2),
    'discount_percent': np.random.choice([5, 10, 15, 20, 25, 30], n_rows),
    'quantity_sold': np.random.randint(1, 11, n_rows),
    'customer_region': np.random.choice(
        ['North America', 'Europe', 'Asia', 'South America', 'Africa', 'Oceania'],
        n_rows,
        p=[0.25, 0.25, 0.30, 0.10, 0.05, 0.05]  # Realistic distribution
    ),
    'payment_method': np.random.choice(
        ['Credit Card', 'Debit Card', 'UPI', 'PayPal', 'Net Banking'],
        n_rows,
        p=[0.35, 0.20, 0.15, 0.20, 0.10]  # Realistic distribution
    ),
    'rating': np.round(np.random.uniform(1.0, 5.0, n_rows), 1),
    'review_count': np.random.randint(1, 1001, n_rows),
}

# Create DataFrame
df = pd.DataFrame(data)

# Calculate discounted_price
df['discounted_price'] = np.round(
    df['price'] * (1 - df['discount_percent'] / 100), 2
)

# Calculate total_revenue
df['total_revenue'] = np.round(
    df['discounted_price'] * df['quantity_sold'], 2
)

# Reorder columns to match schema
columns_order = [
    'order_id', 'order_date', 'product_id', 'product_category', 'price',
    'discount_percent', 'quantity_sold', 'customer_region', 'payment_method',
    'rating', 'review_count', 'discounted_price', 'total_revenue'
]
df = df[columns_order]

# Save to CSV
output_path = '/home/runner/work/E-COMMERCE/E-COMMERCE/data/amazon_sales.csv'
df.to_csv(output_path, index=False)

print(f"✓ CSV file generated successfully!")
print(f"✓ File location: {output_path}")
print(f"✓ Total rows: {len(df)}")
print(f"✓ Total columns: {len(df.columns)}")
print(f"\nFirst 5 rows:")
print(df.head())
print(f"\nLast 5 rows:")
print(df.tail())
print(f"\nData types:")
print(df.dtypes)
print(f"\nData summary:")
print(df.describe())
