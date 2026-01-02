import { useState, useEffect } from 'react';
import GuideSideNav from '../../components/SideNavguide';
import GuideTopNav from '../../components/TopNavGuide';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: string;
  status: string;
  statusColor: string;
}

export default function GuidePayouts() {
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payoutOverview, setPayoutOverview] = useState({
    availableBalance: '$0.00',
    pendingPayouts: '$0.00',
    lastPayout: '$0.00',
  });
  const [transactionHistory, setTransactionHistory] = useState<Transaction[]>([]);
  const [userUid, setUserUid] = useState<string | null>(null);

  useEffect(() => {
    const uid = localStorage.getItem('userUid');
    setUserUid(uid);
  }, []);

  useEffect(() => {
    const fetchPayouts = async () => {
      if (!userUid) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/guide/payouts?guideId=${userUid}&limit=50`);
        if (!response.ok) throw new Error('Failed to fetch payouts');
        const data = await response.json();
        
        if (data.success) {
          if (data.summary) {
            setPayoutOverview({
              availableBalance: `$${data.summary.availableBalance.toFixed(2)}`,
              pendingPayouts: `$${data.summary.pendingPayouts.toFixed(2)}`,
              lastPayout: data.summary.lastPayout ? `$${data.summary.lastPayout.toFixed(2)}` : '$0.00',
            });
          }

          const transactions: Transaction[] = data.data.map((p: any) => ({
            id: p.id,
            date: p.createdAt?.toDate
              ? new Date(p.createdAt.toDate()).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            description: p.description || (p.type === 'earning' ? 'Earnings' : 'Payout'),
            amount: p.type === 'earning' ? `+$${p.amount.toFixed(2)}` : `-$${p.amount.toFixed(2)}`,
            status: p.status === 'completed' ? 'Completed' : p.status === 'cleared' ? 'Cleared' : 'Pending',
            statusColor: p.status === 'completed' ? 'green' : p.status === 'cleared' ? 'blue' : 'yellow',
          }));

          setTransactionHistory(transactions);
        }
      } catch (error) {
        console.error('Error fetching payouts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayouts();
  }, [userUid]);

  const payoutMethods = [
    {
      id: 1,
      type: 'Bank Account',
      details: '**** 1234',
      isDefault: true
    },
    {
      id: 2,
      type: 'PayPal',
      details: 'guide@email.com',
      isDefault: false
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Cleared':
        return 'bg-blue-100 text-blue-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <GuideSideNav />

      <div className="flex-1 flex flex-col lg:ml-64">
        <GuideTopNav
          title="Payouts"
          subtitle="Manage your earnings and payout methods."
        />

        <main className="flex-1 p-4 lg:p-6 pt-20 lg:pt-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Payout Overview</h3>

                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Available Balance</p>
                    <p className="text-2xl font-bold text-gray-900">{payoutOverview.availableBalance}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pending Payouts</p>
                    <p className="text-xl font-semibold text-gray-900">{payoutOverview.pendingPayouts}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last Payout</p>
                    <p className="text-xl font-semibold text-gray-900">{payoutOverview.lastPayout}</p>
                  </div>
                </div>

                <button className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors">
                  Request Payout
                </button>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
                    <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors">
                      Download Statement
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                            Loading transactions...
                          </td>
                        </tr>
                      ) : transactionHistory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                            No transactions yet
                          </td>
                        </tr>
                      ) : (
                        transactionHistory.map((transaction) => (
                        <tr key={transaction.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transaction.date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {transaction.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {transaction.amount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                              {transaction.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900">View</button>
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Payout Methods</h3>
                  <button
                    onClick={() => setShowAddMethod(!showAddMethod)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                  >
                    Add New
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {payoutMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {method.type === 'Bank Account' ? '🏦' : '💳'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{method.type}</p>
                          <p className="text-sm text-gray-600">{method.details}</p>
                          {method.isDefault && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="text-gray-600 hover:text-gray-900 p-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button className="text-red-600 hover:text-red-900 p-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
