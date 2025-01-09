import "../PayoutManager.sol";


contract SonicPayoutManager is PayoutManager {

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutManager_init();
    }


    function sonic() external {

    }
}
