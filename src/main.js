function calculateSimpleRevenue(items) {
  return items.reduce((sum, item) => {
    const priceWithDiscount = item.sale_price * (1 - item.discount / 100);
    return sum + priceWithDiscount * item.quantity;
  }, 0);
}

function calculateBonusByProfit(result) {
  for (let i = 0; i < result.length; i++) {
    if (i === 0) {
      result[i].bonus = Math.round(result[i].profit * 0.15 * 100) / 100;
    } else if (i === 1 || i === 2) {
      result[i].bonus = Math.round(result[i].profit * 0.10 * 100) / 100;
    } else if (i === result.length - 1) {
      result[i].bonus = 0;
    } else {
      result[i].bonus = Math.round(result[i].profit * 0.05 * 100) / 100;
    }
  }
}


  function analyzeSalesData(data) {
  // Проверка, что data передан и является объектом
  if (!data || typeof data !== 'object') {
    throw new Error("Некорректные опции: должен быть передан объект 'data'.");
  }

  // Проверка наличия и типа обязательных полей
  if (!Array.isArray(data.sellers)) {
    throw new Error("Некорректные опции: поле 'sellers' должно быть массивом.");
  }
  if (!Array.isArray(data.products)) {
    throw new Error("Некорректные опции: поле 'products' должно быть массивом.");
  }
  if (!Array.isArray(data.purchase_records)) {
    throw new Error("Некорректные опции: поле 'purchase_records' должно быть массивом.");
  }

  // Проверка на пустые массивы
  if (data.sellers.length === 0) {
    throw new Error("Нет данных о продавцах (sellers).");
  }

  if (data.products.length === 0) {
    throw new Error("Нет данных о продуктах (products).");
  }

  if (data.purchase_records.length === 0) {
    throw new Error("Нет данных о продажах (purchase_records).");
  }
  if (!data.sellers || data.sellers.length === 0) {
    throw new Error("Нет данных о продавцах (sellers).");
  }

  if (!data.products || data.products.length === 0) {
    throw new Error("Нет данных о продуктах (products).");
  }

  if (!data.purchase_records || data.purchase_records.length === 0) {
    throw new Error("Нет данных о продажах (purchase_records).");
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

    const revenue = calculateSimpleRevenue(receipt.items);

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
  calculateBonusByProfit(result);
  return result;
}