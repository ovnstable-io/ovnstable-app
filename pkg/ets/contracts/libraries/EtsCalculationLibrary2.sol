// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "hardhat/console.sol";

enum ActionType {
    ADD_LIQUIDITY, // D2, D6 < 0
    REMOVE_LIQUIDITY, // D2, D6 > 0

    SUPPLY_ASSET_TO_AAVE, // D4 > 0
    WITHDRAW_ASSET_FROM_AAVE, // D4 < 0

    BORROW_TOKEN_FROM_AAVE, // D5 > 0
    REPAY_TOKEN_TO_AAVE, // D5 < 0

    SWAP_TOKEN_TO_ASSET, // D3 < 0
    SWAP_ASSET_TO_TOKEN  // D3 > 0
}


enum Method {
    NOTHING,
    STAKE,
    UNSTAKE
}

// Amounts in decimals specific token, all positive
struct Amounts {
    uint256 collateralAsset;
    uint256 borrowToken;
    uint256 poolToken;
    uint256 poolWbtc;
    uint256 freeWbtc;
    uint256 freeToken;
}

// liquidity in USD e6, all positive
struct Liquidity {
    int256 collateralAsset;
    int256 borrowToken;
    int256 poolToken;
    int256 poolWbtc;
    int256 freeWbtc;
    int256 freeToken;
}

// liquidity deltas in USD e6, may contain zeroes and below zero
struct Deltas {
    // int256 d1;
    int256 d2;
    int256 d3;
    int256 d4;
    int256 d5;
    int256 d6;
    uint256 code;
}

struct Action {
    ActionType actionType;
    uint256 amount;
    uint256 slippagePercent;
}

struct Action2 {
    uint256 actionType;
    uint256 amount;
    uint256 slippagePercent;
}

struct CalcContext {
    int256 K1; // in e18
    int256 K2; // in e18
    int256 amount; // amount in USD, below zero if UNSTAKE
    Liquidity liq; // in USD e6
    uint256 tokenAssetSlippagePercent;
    Deltas deltas; // in USD e6
}

struct CalcContext2 {
    int256 K1; // in e18
    int256 K2; // in e18
    int256 amount; // amount in USD, below zero if UNSTAKE
    Liquidity liq; // in USD e6
    uint256 tokenAssetSlippagePercent;
}


library EtsCalculationLibrary2{

    uint256 public constant MAX_UINT_VALUE = type(uint256).max;

    // /**
    //   * d1 = -d2 - Lam - LFu;
    //   */
    // function calcD1(CalcContext memory ctx) internal pure {
    //     ctx.deltas.d1 = - ctx.deltas.d2 - ctx.amount - ctx.liq.freeWbtc;
    // }

    /**
      * d2 = d6 * K2;
      */
    function calcD2(CalcContext memory ctx) internal pure {
        ctx.deltas.d2 = ctx.deltas.d6 * ctx.K2 / 1e18;
    }

    /**
      * d3 = -LFw - d5 - d6;
      */
    function calcD3(CalcContext memory ctx) internal pure {
        ctx.deltas.d3 = - ctx.liq.freeToken - ctx.deltas.d5 - ctx.deltas.d6;
    }

    /**
      * d4 = K1 * (LBw + d5) - LCu;
      */
    function calcD4(CalcContext memory ctx) internal pure {
        ctx.deltas.d4 = (ctx.liq.borrowToken + ctx.deltas.d5) * ctx.K1 / 1e18 - ctx.liq.collateralAsset;
    }

    /**
      * d5 = LPw - LBw - d6;
      */
    function calcD5(CalcContext memory ctx) internal pure {
        ctx.deltas.d5 = ctx.liq.poolToken - ctx.liq.borrowToken - ctx.deltas.d6;
    }

    /**
     * d6 = ((K1 - 1) * LPw + LBw - LCu - LFu - LFuc - LFw - Lam) / (K1 + K2);
     */
    function calcD6(CalcContext memory ctx) internal view {

        logSign("K1:", ctx.K1);
        logSign("K2:", ctx.K2);


        int256 a = (ctx.K1 - 1e18) * ctx.liq.poolToken / 1e18;
        logSign("a:", a);
        a = a + ctx.liq.borrowToken;
        logSign("a:", a);
        a = a - ctx.liq.collateralAsset;
        logSign("a:", a);
        a = a - ctx.liq.freeWbtc;
        logSign("a:", a);
        a = a - ctx.liq.freeToken;
        logSign("a:", a);
        a = a - ctx.amount;
        logSign("a:", a);

        int256 b = ctx.K1 + ctx.K2;
        logSign("b:", b);
        int256 d6 = 1e18 * a / b;

        ctx.deltas.d6 = d6;
    }

    function logSign(string memory msg, int256 value) internal view {
        if (value < 0) {
            console.log(msg, "-", toUint256(- value));
        } else {
            console.log(msg, toUint256(value));
        }
    }

    function abs(int256 value) internal pure returns (uint256){
        if (value < 0) {
            return toUint256(- value);
        } else {
            return toUint256(value);
        }
    }

    function toUint256(int256 value) internal pure returns (uint256) {
        require(value >= 0, "SafeCast: value must be positive");
        return uint256(value);
    }

    function toInt256(uint256 value) internal pure returns (int256) {
        // Note: Unsafe cast below is okay because `type(int256).max` is guaranteed to be positive
        require(value <= uint256(type(int256).max), "SafeCast: value doesn't fit in an int256");
        return int256(value);
    }


    /**
      * NAV = sum of all tokens liquidity minus borrows.
      * @return NAV in USD
      */
    function _netAssetValue(Liquidity memory liq) internal pure returns (int256){

        // add liquidity in free tokens
        int256 navUsd = liq.freeWbtc + liq.freeToken;
        // add liquidity in pool
        navUsd = navUsd + liq.poolToken + liq.poolWbtc;
        // add liquidity in aave collateral minus borrow
        navUsd = navUsd + liq.collateralAsset - liq.borrowToken;

        return navUsd;
    }

    function liquidityToActions(CalcContext2 memory ctx2) public view returns (Action[] memory, uint256) {

        Deltas memory deltas = Deltas(0, 0, 0, 0, 0, 0);
        CalcContext memory ctx = CalcContext(ctx2.K1, ctx2.K2, ctx2.amount, ctx2.liq, ctx2.tokenAssetSlippagePercent, deltas);

        //if it is unstake then increase unstake amount to awoid slippages on swap
        if (ctx.amount < 0) {
            //if decrease on tokenAssetSlippagePercent then newAmount became oldAmount
            ctx.amount = ctx.amount * 10000 / (10000 - toInt256(ctx.tokenAssetSlippagePercent));
        }

        // order specified, don't change
        calcD6(ctx);
        calcD2(ctx);
        calcD5(ctx);
        calcD4(ctx);
        calcD3(ctx);
        ctx.deltas.code = 2 * (ctx.deltas.d2 >= 0 ? 1 : 0) + 4 * (ctx.deltas.d3 >= 0 ? 1 : 0) + 8 * (ctx.deltas.d4 >= 0 ? 1 : 0) + 16 * (ctx.deltas.d5 >= 0 ? 1 : 0);

        console.log("-------- Deltas");
        logSign("d2:", ctx.deltas.d2);
        logSign("d3:", ctx.deltas.d3);
        logSign("d4:", ctx.deltas.d4);
        logSign("d5:", ctx.deltas.d5);
        logSign("d6:", ctx.deltas.d6);
        console.log("code:", ctx.deltas.code);
        console.log("--------");

        Action[] memory actions = new Action[](6);
        uint index;

        deltas = ctx.deltas;

        if (deltas.d3 < 0 && deltas.d4 >= 0 && deltas.d5 >= 0) {
            // 2 circle cases: 1100,1101 --> 23452
            actions[index++] = Action(ActionType.REMOVE_LIQUIDITY, abs(deltas.d3), 0);
            actions[index++] = Action(ActionType.SWAP_TOKEN_TO_ASSET, abs(deltas.d3), ctx.tokenAssetSlippagePercent);
            actions[index++] = Action(ActionType.SUPPLY_ASSET_TO_AAVE, abs(deltas.d4), 0);
            actions[index++] = Action(ActionType.BORROW_TOKEN_FROM_AAVE, abs(deltas.d5), 0);
            actions[index++] = Action(ActionType.ADD_LIQUIDITY, (ctx2.amount < 0) ? uint(-ctx2.amount) : MAX_UINT_VALUE, 0);
        } else if (deltas.d3 >= 0 && deltas.d4 < 0 && deltas.d5 < 0) {
            // 2 circle cases: 0010,0011 --> 23542
            actions[index++] = Action(ActionType.REMOVE_LIQUIDITY, abs(deltas.d5), 0);
            actions[index++] = Action(ActionType.REPAY_TOKEN_TO_AAVE, abs(deltas.d5), 0);
            actions[index++] = Action(ActionType.WITHDRAW_ASSET_FROM_AAVE, abs(deltas.d4), 0);
            actions[index++] = Action(ActionType.SWAP_ASSET_TO_TOKEN, abs(deltas.d3), ctx.tokenAssetSlippagePercent);
            actions[index++] = Action(ActionType.ADD_LIQUIDITY, (ctx2.amount < 0) ? uint(-ctx2.amount) : MAX_UINT_VALUE, 0);
        } else if (deltas.d2 >= 0 && deltas.d3 < 0) {
            // 3 cases: 0001,0101,1001 --> 2534
            actions[index++] = Action(ActionType.REMOVE_LIQUIDITY, abs(deltas.d6), 0);
            actions[index++] = Action((deltas.d5 < 0) ? ActionType.REPAY_TOKEN_TO_AAVE : ActionType.BORROW_TOKEN_FROM_AAVE, abs(deltas.d5), 0);
            actions[index++] = Action(ActionType.SWAP_TOKEN_TO_ASSET, abs(deltas.d3), ctx.tokenAssetSlippagePercent);
            actions[index++] = Action((deltas.d4 < 0) ? ActionType.WITHDRAW_ASSET_FROM_AAVE : ActionType.SUPPLY_ASSET_TO_AAVE, abs(deltas.d4), 0);
        } else if (deltas.d2 >= 0 && deltas.d3 >= 0) {
            // 3 cases: 0111,1011,1111 --> 2435
            actions[index++] = Action(ActionType.REMOVE_LIQUIDITY, abs(deltas.d6), 0);
            actions[index++] = Action((deltas.d4 < 0) ? ActionType.WITHDRAW_ASSET_FROM_AAVE : ActionType.SUPPLY_ASSET_TO_AAVE, abs(deltas.d4), 0);
            actions[index++] = Action(ActionType.SWAP_ASSET_TO_TOKEN, abs(deltas.d3), ctx.tokenAssetSlippagePercent);
            actions[index++] = Action((deltas.d5 < 0) ? ActionType.REPAY_TOKEN_TO_AAVE : ActionType.BORROW_TOKEN_FROM_AAVE, abs(deltas.d5), 0);
        } else if (deltas.d2 < 0 && deltas.d4 < 0) {
            // 3 cases: 0000,1000,1010 --> 5432
            actions[index++] = Action((deltas.d5 < 0) ? ActionType.REPAY_TOKEN_TO_AAVE : ActionType.BORROW_TOKEN_FROM_AAVE, abs(deltas.d5), 0);
            actions[index++] = Action((deltas.d4 < 0) ? ActionType.WITHDRAW_ASSET_FROM_AAVE : ActionType.SUPPLY_ASSET_TO_AAVE, abs(deltas.d4), 0);
            actions[index++] = Action((deltas.d3 < 0) ? ActionType.SWAP_TOKEN_TO_ASSET : ActionType.SWAP_ASSET_TO_TOKEN, abs(deltas.d3), ctx.tokenAssetSlippagePercent);
            actions[index++] = Action(ActionType.ADD_LIQUIDITY, (ctx2.amount < 0) ? uint(-ctx2.amount) : MAX_UINT_VALUE, 0);
        } else if (deltas.d2 < 0 && deltas.d4 >= 0) {
            // 3 cases: 0100,0110,1110 --> 3452
            actions[index++] = Action((deltas.d3 < 0) ? ActionType.SWAP_TOKEN_TO_ASSET : ActionType.SWAP_ASSET_TO_TOKEN, abs(deltas.d3), ctx.tokenAssetSlippagePercent);
            actions[index++] = Action((deltas.d4 < 0) ? ActionType.WITHDRAW_ASSET_FROM_AAVE : ActionType.SUPPLY_ASSET_TO_AAVE, abs(deltas.d4), 0);
            actions[index++] = Action((deltas.d5 < 0) ? ActionType.REPAY_TOKEN_TO_AAVE : ActionType.BORROW_TOKEN_FROM_AAVE, abs(deltas.d5), 0);
            actions[index++] = Action(ActionType.ADD_LIQUIDITY, (ctx2.amount < 0) ? uint(-ctx2.amount) : MAX_UINT_VALUE, 0);
        } 

        // reassemble array
        Action[] memory tmp = new Action[](index);
        for (uint j; j < index; j++) {
            tmp[j] = actions[j];
        }
        actions = tmp;

        console.log("--------- actions");
        for (uint j; j < actions.length; j++) {
            console.log(j, uint(actions[j].actionType), actions[j].amount);
        }
        console.log("---------");
        return (actions, ctx.deltas.code);
    }

}


