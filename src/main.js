function calculateSimpleRevenue(purchase, _product) {
  const { discount, sale_price, quantity } = purchase;
  const priceWithDiscount = sale_price * (1 - discount / 100);
  return priceWithDiscount * quantity;
}

function calculateBonusByProfit(index, total, seller) {
  if (index === 0) {
    return Math.round(seller.profit * 0.15 * 100) / 100;
  } else if (index === 1 || index === 2) {
    return Math.round(seller.profit * 0.10 * 100) / 100;
  } else if (index === total - 1) {
    return 0;
  } else {
    return Math.round(seller.profit * 0.05 * 100) / 100;
  }
}

function analyzeSalesData(data, options = {}) {
  if (!data.sellers || data.sellers.length === 0) {
    throw new Error("Нет данных о продавцах (sellers).");
  }

  if (!data.products || data.products.length === 0) {
    throw new Error("Нет данных о продуктах (products).");
  }

  if (!data.purchase_records || data.purchase_records.length === 0) {
    throw new Error("Нет данных о продажах (purchase_records).");
  }

  if (typeof options !== "object" || options === null) {
    throw new Error("Опции должны быть объектом.");
  }

  const { calculateRevenue, calculateBonus } = options;

  if (!calculateRevenue || !calculateBonus) {
    throw new Error("В опциях должны быть определены calculateRevenue и calculateBonus.");
  }

  if (typeof calculateRevenue !== "function" || typeof calculateBonus !== "function") {
    throw new Error("calculateRevenue и calculateBonus должны быть функциями.");
  }

  const productsMap = new Map(data.products.map(p => [p.sku, p]));
  const sellersData = new Map();

  data.sellers.forEach(seller => {
    sellersData.set(seller.id, {
      seller_id: seller.id,
      name: `${seller.first_name} ${seller.last_name}`,
      revenue: 0,
      profit: 0,
      sales_count: 0,
      products: new Map()
    });
  });

  for (const receipt of data.purchase_records) {
    const seller = sellersData.get(receipt.seller_id);
    if (!seller) continue;

    let revenue = 0;
    for (const item of receipt.items) {
      const product = productsMap.get(item.sku);
      if (!product) continue;
      revenue += calculateRevenue(item, product);
    }

    let totalPurchaseCost = 0;
    for (const item of receipt.items) {
      const product = productsMap.get(item.sku);
      if (!product) continue;
      totalPurchaseCost += product.purchase_price * item.quantity;
    }

    const profit = revenue - totalPurchaseCost;

    seller.revenue += revenue;
    seller.profit += profit;
    seller.sales_count += 1;

    for (const item of receipt.items) {
      const oldQty = seller.products.get(item.sku) || 0;
      seller.products.set(item.sku, oldQty + item.quantity);
    }
  }

  let result = Array.from(sellersData.values()).map(seller => {
    const top_products = Array.from(seller.products.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([sku, quantity]) => ({ sku, quantity }));

    return {
      seller_id: seller.seller_id,
      name: seller.name,
      revenue: Math.round(seller.revenue * 100) / 100,
      profit: Math.round(seller.profit * 100) / 100,
      sales_count: seller.sales_count,
      top_products,
      bonus: 0
    };
  });

  result.sort((a, b) => b.profit - a.profit);
  const totalSellers = result.length;
  for (let i = 0; i < totalSellers; i++) {
    result[i].bonus = calculateBonusByProfit(i, totalSellers, result[i]);
  }
  return result;
}