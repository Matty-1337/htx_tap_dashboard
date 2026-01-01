# CSV Header Names Documentation

This document lists all column headers found across the 7 CSV files used in the HTX TAP Dashboard.

## File 1: Completed Discounts (1).csv
- Location
- Order Id
- Order Guid
- Order #
- Opened Date
- Applied Date
- Server
- Approver
- Table
- Discount Guid

## File 2: Completed Voids.csv
- Selection Id
- Check Id
- Order Id
- Order #
- Opened Date
- Void Date
- Server
- Driver
- Approver
- Item Name

## File 3: December Sales.csv
- Order Id
- Order #
- Sent Date
- Order Date
- Check Id
- Server
- Table
- Dining Area
- Service
- Dining Option

## File 4: Labor Hours.csv
- Employee
- Job Title
- Regular Hours
- Overtime Hours
- Hourly Rate
- Regular Pay
- Overtime Pay
- Total Pay
- Net Sales
- Declared Tips

## File 5: November Sales.csv
- Order Id
- Order #
- Sent Date
- Order Date
- Check Id
- Server
- Table
- Dining Area
- Service
- Dining Option

## File 6: October Sales.csv
- Order Id
- Order #
- Sent Date
- Order Date
- Check Id
- Server
- Table
- Dining Area
- Service
- Dining Option

## File 7: RemovedItemsDetails_2025_10_01-2025_12_28.csv
- Removed Date
- Order #
- Server
- Item Name
- Item Quantity
- Total Price
- Removed Item Selection Id

---

## Complete Unique Column List (Alphabetical)

### Date Columns
- Applied Date
- Opened Date
- Order Date
- Removed Date
- Sent Date
- Void Date

### Revenue/Price Columns
- Net Sales
- Total Pay
- Total Price

### Order/Transaction Columns
- Check Id
- Discount Guid
- Order #
- Order Guid
- Order Id
- Removed Item Selection Id
- Selection Id

### Item/Product Columns
- Item Name
- Item Quantity

### Employee/Staff Columns
- Approver
- Driver
- Employee
- Job Title
- Server

### Location/Service Columns
- Dining Area
- Dining Option
- Location
- Service
- Table

### Labor/Payroll Columns
- Declared Tips
- Hourly Rate
- Overtime Hours
- Overtime Pay
- Regular Hours
- Regular Pay

---

## Column Mapping for Analytics

### Date Columns (for time-based analysis)
- **Primary**: Order Date, Sent Date, Opened Date
- **Secondary**: Applied Date, Removed Date, Void Date

### Revenue Columns (for financial analysis)
- **Primary**: Total Price, Net Sales
- **Secondary**: Total Pay (for labor costs)

### Item Columns (for menu analysis)
- **Primary**: Item Name
- **Secondary**: Item Quantity

### Order Columns (for transaction tracking)
- **Primary**: Order Id, Order #
- **Secondary**: Check Id, Selection Id

---

## Notes for Python Code

1. **All column names use Title Case with Spaces** (not underscores)
2. **Date columns** may appear as: "Order Date", "Sent Date", "Opened Date", etc.
3. **Revenue columns** may appear as: "Total Price", "Net Sales", "Total Pay"
4. **Item columns** appear as: "Item Name", "Item Quantity"
5. **The normalize_column_name() function handles all variations** (spaces, underscores, case)

---

*Last Updated: Based on CSV files loaded in HTX TAP Dashboard*

