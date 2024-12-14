module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/staking/delegationListByAddress',
        destination: 'https://scan.platon.network/browser-server/staking/delegationListByAddress',
      },
      {
        source: '/api/staking/aliveStakingList',
        destination: 'https://scan.platon.network/browser-server/staking/aliveStakingList',
      },
      {
        source: '/api/staking/stakingDetails',
        destination: 'https://scan.platon.network/browser-server/staking/stakingDetails',
      },
      {
        source: '/api/address/details',
        destination: 'https://scan.platon.network/browser-server/address/details',
      }
    ];
  },
  images: {
    domains: ['s3.amazonaws.com'],
  },
}; 