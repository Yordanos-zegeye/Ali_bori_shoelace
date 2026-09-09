import urllib.request
import json
import sys

def post(endpoint, data):
    req = urllib.request.Request(
        f'http://localhost:8000/api/v1{endpoint}',
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f'POST {endpoint} Error ({e.code}):', e.read().decode('utf-8'))
        raise e

def patch(endpoint, data):
    req = urllib.request.Request(
        f'http://localhost:8000/api/v1{endpoint}',
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='PATCH'
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f'PATCH {endpoint} Error ({e.code}):', e.read().decode('utf-8'))
        raise e

def get(endpoint):
    with urllib.request.urlopen(f'http://localhost:8000/api/v1{endpoint}') as resp:
        return json.loads(resp.read().decode('utf-8'))

print('=== 1. Find or Create Customer ===')
customers = get('/sales/customers/').get('results', [])
c1 = next((c for c in customers if c['customer_code'] == 'CUST-001'), None)
if not c1:
    c1 = post('/sales/customers/', {
        'customer_code': 'CUST-001',
        'name': 'Merkato Central Habesha Laces',
        'customer_type': 'WHOLESALER',
        'phone': '+251-911-234567',
        'address': 'Merkato Military Tera, Addis Ababa',
        'credit_limit': '150000.00'
    })
print('Customer Ready:', c1['name'], '| Credit Limit:', c1['credit_limit'])

print('=== 2. Create Production Batch ===')
variants = get('/catalog/variants/')['results']
variant_id = variants[0]['id']
batch = post('/production/batches/', {
    'product_variant': variant_id,
    'raw_yarn_input_kg': '100.00',
    'supervisor': 'Kebede Alemu',
    'notes': 'Production test run'
})
print('Batch Created:', batch['batch_number'], '| Input:', batch['raw_yarn_input_kg'])

print('=== 3. Complete Phase 1 Braiding ===')
batch_id = batch['id']
batch = patch(f'/production/batches/{batch_id}/', {
    'braided_output_kg': '96.50',
    'phase1_waste_kg': '3.50',
    'status': 'PHASE_1_COMPLETE'
})
print('Phase 1 Done. Braided:', batch['braided_output_kg'], 'KG')

print('=== 4. Complete Phase 2 Tipping & Pack Bag (25-40 KG) ===')
batch = patch(f'/production/batches/{batch_id}/', {
    'tipping_input_kg': '96.50',
    'finished_output_kg': '94.00',
    'phase2_waste_kg': '2.50',
    'total_waste_kg': '6.00',
    'yield_percentage': '94.00',
    'waste_percentage': '6.00',
    'status': 'COMPLETED'
})
print('Batch Completed! Yield:', batch['yield_percentage'], '% | Waste:', batch['waste_percentage'], '%')

bag = post('/store/bags/', {
    'batch': batch_id,
    'product_variant': variant_id,
    'weight_kg': '30.00',
    'store_location': 'SECTION_A_RACK_01',
    'status': 'IN_STORE'
})
print('Finished Bag Packed:', bag['bag_id'], '| Weight:', bag['weight_kg'], 'KG')

print('=== 5. Process Credit Dispatch Order ===')
dispatch = post('/sales/orders/', {
    'customer': c1['id'],
    'payment_mode': 'CREDIT',
    'items': [{'bag': bag['id'], 'price_per_kg': '180.00'}],
    'notes': 'Wholesale delivery note'
})
print('Dispatch Order Created:', dispatch['order_number'], '| Total Amount:', dispatch['total_amount'], 'ETB')

print('=== 6. Collect Partial Payment ===')
dispatch_id = dispatch['id']
payment = post(f'/sales/orders/{dispatch_id}/collect-payment/', {
    'amount': '2500.00',
    'payment_method': 'BANK_TRANSFER',
    'reference': 'CBE-TXN-984214'
})
print('Payment Collected! New Status:', payment['status'], '| Remaining:', payment['outstanding_amount'], 'ETB')

print('=== 7. Create Payroll Period & Calculate Wages ===')
periods = get('/workforce/payroll-periods/').get('results', [])
p_code = 'PAY-2026-09'
period = next((p for p in periods if p['period_code'] == p_code), None)
if not period:
    period = post('/workforce/payroll-periods/', {
        'period_code': p_code,
        'start_date': '2026-09-01',
        'end_date': '2026-09-30',
        'working_days': 26
    })
print('Payroll Period Ready:', period['period_code'])

period_id = period['id']
calc = post(f'/workforce/payroll-periods/{period_id}/calculate/', {})
print('Payroll Calculated! Gross:', calc['total_gross_salary'], 'ETB | Net:', calc['total_net_salary'], 'ETB | Slips:', len(calc['slips']))

print('\n>>> ALL 7 CORE FACTORY ACCEPTANCE WORKFLOWS SUCCEEDED IN LIVE NEON POSTGRESQL! <<<')
