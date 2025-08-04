# Income Sources Table Update - Companies Instead of Categories

## Overview
Updated the Income Sources table in the Analytics page to display companies/employers instead of income categories (like Salary, Freelance, etc.).

## Changes Made

### 1. Modified Income Source Data Calculation
**File**: `app/analytics/page.tsx` (lines ~320-420)

**Before**: Grouped income by categories like:
- Salary
- Freelance  
- Investments
- Government
- Business
- Side Income

**After**: Groups income by company/employer names extracted from transaction data:
- Company names from `merchantName` field
- Cleaned transaction names (removing prefixes like "DIRECT DEP", "PAYROLL")
- Special handling for government sources (IRS, Social Security, etc.)
- Proper capitalization and formatting

### 2. Enhanced Company Name Extraction Logic
The new logic:
- **Prioritizes merchant name** when available
- **Cleans transaction names** by removing common prefixes/suffixes:
  - `DIRECT DEP`, `DD`, `PAYROLL`, `ACH`, `WIRE`
  - Trailing numbers, dates, and special characters
- **Handles special cases**:
  - Unemployment Benefits
  - Social Security Administration  
  - IRS Tax Refund
  - Government Stimulus
  - Investment Dividends
  - Interest Income
- **Limits display length** to 25 characters for better UI
- **Proper capitalization** for company names

### 3. Updated Chart Configuration
**File**: `app/analytics/page.tsx`

- Changed chart config from income type labels to generic company labels
- Updated color scheme to accommodate more companies
- Changed "Other Income" to "Other Companies" for grouped smaller sources

### 4. Updated UI Text
- **Title**: Remains "Income Sources" 
- **Description**: Changed from "Breakdown of income streams" to "Breakdown by companies and income sources"
- **Empty state**: Updated message to mention "company breakdown"

## How It Works

### Data Processing Flow:
1. **Filter Income Transactions**: Gets all transactions with negative amounts (income in Plaid)
2. **Extract Company Names**: 
   - Uses `merchantName` if available
   - Otherwise parses and cleans `transaction.name`
   - Applies special case handling for government/investment sources
3. **Group by Company**: Sums all income amounts per company
4. **Sort and Limit**: Shows top 5 companies, groups rest into "Other Companies"
5. **Display**: Shows in both pie chart and detailed list with percentages

### Example Transformations:
- `"DIRECT DEP ACME CORP PAYROLL"` → `"Acme Corp"`
- `"DD TECH STARTUP INC"` → `"Tech Startup Inc"`
- `"PAYROLL GOOGLE LLC"` → `"Google Llc"`
- `"IRS TAX REFUND"` → `"IRS Tax Refund"`
- `"UNEMPLOYMENT BENEFITS"` → `"Unemployment Benefits"`

## Benefits

### For Users:
- **More Actionable Insights**: See exactly which companies/employers provide income
- **Better Financial Planning**: Understand income source diversification
- **Clearer Visualization**: Actual company names vs generic categories

### For Analytics:
- **Real Data Utilization**: Uses actual transaction merchant data
- **Flexible Grouping**: Handles various transaction naming patterns
- **Scalable Display**: Automatically groups smaller sources

## Technical Implementation

### Robust Name Parsing:
- Handles multiple transaction naming conventions
- Removes common banking prefixes/suffixes
- Maintains data integrity with fallbacks

### Smart Categorization:
- Recognizes government sources
- Identifies investment income
- Preserves company identity while cleaning formatting

### UI Consistency:
- Maintains existing chart styling and interactions
- Preserves color coding and percentage calculations
- Keeps responsive design intact

## Future Enhancements

### Potential Improvements:
1. **Company Logo Integration**: Could fetch and display company logos
2. **Industry Categorization**: Group companies by industry sectors  
3. **Income Trend Analysis**: Track income changes per company over time
4. **Manual Company Mapping**: Allow users to manually map transaction names to companies

The update provides users with much more specific and actionable information about their income sources while maintaining the existing UI/UX patterns.