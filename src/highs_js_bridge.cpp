#include <algorithm>
#include <cstring>
#include <limits>
#include <string>

#include "Highs.h"
#include "interfaces/highs_c_api.h"

namespace {

HighsInt copy_name(const Highs* highs, const HighsLp& lp, bool is_col,
                   HighsInt index, char* destination, HighsInt capacity,
                   HighsInt* required_capacity) {
  if (!highs || !required_capacity || capacity < 0) return kHighsStatusError;
  std::string name;
  const HighsStatus status =
      highs->getColOrRowName(lp, is_col, index, name);
  if (status == HighsStatus::kError) return kHighsStatusError;

  const size_t required = name.size() + 1;
  if (required > static_cast<size_t>(std::numeric_limits<HighsInt>::max()))
    return kHighsStatusError;
  *required_capacity = static_cast<HighsInt>(required);

  if (!destination || capacity == 0) return static_cast<HighsInt>(status);
  const size_t copy_size =
      std::min(name.size(), static_cast<size_t>(capacity - 1));
  std::memcpy(destination, name.data(), copy_size);
  destination[copy_size] = '\0';
  return required <= static_cast<size_t>(capacity)
             ? static_cast<HighsInt>(status)
             : kHighsStatusWarning;
}

void copy_mip_callback_data(const HighsCallbackOutput& source,
                            HighsCallbackDataOut& destination) {
  destination.running_time = source.running_time;
  destination.objective_function_value = source.objective_function_value;
  destination.mip_node_count = source.mip_node_count;
  destination.mip_total_lp_iterations = source.mip_total_lp_iterations;
  destination.mip_primal_bound = source.mip_primal_bound;
  destination.mip_dual_bound = source.mip_dual_bound;
  destination.mip_gap = source.mip_gap;
}

HighsCallbackDataOut safe_callback_output(
    int type, const HighsCallbackOutput& source) {
  HighsCallbackDataOut destination{};
  destination.cbdata =
      static_cast<void*>(const_cast<HighsCallbackOutput*>(&source));

  if (type == kHighsCallbackLogging) {
    destination.log_type = static_cast<int>(source.log_type);
    return destination;
  }
  if (type == kHighsCallbackSimplexInterrupt) {
    destination.simplex_iteration_count = source.simplex_iteration_count;
    return destination;
  }
  if (type == kHighsCallbackIpmInterrupt) {
    destination.ipm_iteration_count = source.ipm_iteration_count;
    return destination;
  }

  copy_mip_callback_data(source, destination);
  if (type == kHighsCallbackMipSolution ||
      type == kHighsCallbackMipImprovingSolution) {
    destination.mip_solution_size =
        static_cast<HighsInt>(source.mip_solution.size());
    destination.mip_solution =
        source.mip_solution.empty()
            ? nullptr
            : const_cast<double*>(source.mip_solution.data());
  } else if (type == kHighsCallbackMipGetCutPool) {
    destination.cutpool_num_col = source.cutpool_num_col;
    destination.cutpool_num_cut =
        static_cast<HighsInt>(source.cutpool_lower.size());
    destination.cutpool_num_nz =
        static_cast<HighsInt>(source.cutpool_value.size());
    destination.cutpool_start =
        source.cutpool_start.empty()
            ? nullptr
            : const_cast<HighsInt*>(source.cutpool_start.data());
    destination.cutpool_index =
        source.cutpool_index.empty()
            ? nullptr
            : const_cast<HighsInt*>(source.cutpool_index.data());
    destination.cutpool_value =
        source.cutpool_value.empty()
            ? nullptr
            : const_cast<double*>(source.cutpool_value.data());
    destination.cutpool_lower =
        source.cutpool_lower.empty()
            ? nullptr
            : const_cast<double*>(source.cutpool_lower.data());
    destination.cutpool_upper =
        source.cutpool_upper.empty()
            ? nullptr
            : const_cast<double*>(source.cutpool_upper.data());
  }
  return destination;
}

}  // namespace

extern "C" {

HighsInt Highs_js_getColName(const void* highs, HighsInt column,
                             char* destination, HighsInt capacity,
                             HighsInt* required_capacity) {
  const Highs* instance = static_cast<const Highs*>(highs);
  if (!instance) return kHighsStatusError;
  return copy_name(instance, instance->getLp(), true, column, destination,
                   capacity, required_capacity);
}

HighsInt Highs_js_getRowName(const void* highs, HighsInt row,
                             char* destination, HighsInt capacity,
                             HighsInt* required_capacity) {
  const Highs* instance = static_cast<const Highs*>(highs);
  if (!instance) return kHighsStatusError;
  return copy_name(instance, instance->getLp(), false, row, destination,
                   capacity, required_capacity);
}

HighsInt Highs_js_getPresolvedColName(const void* highs, HighsInt column,
                                      char* destination, HighsInt capacity,
                                      HighsInt* required_capacity) {
  const Highs* instance = static_cast<const Highs*>(highs);
  if (!instance) return kHighsStatusError;
  return copy_name(instance, instance->getPresolvedLp(), true, column,
                   destination, capacity, required_capacity);
}

HighsInt Highs_js_getPresolvedRowName(const void* highs, HighsInt row,
                                      char* destination, HighsInt capacity,
                                      HighsInt* required_capacity) {
  const Highs* instance = static_cast<const Highs*>(highs);
  if (!instance) return kHighsStatusError;
  return copy_name(instance, instance->getPresolvedLp(), false, row,
                   destination, capacity, required_capacity);
}

HighsInt Highs_js_setCallback(void* highs, HighsCCallbackType callback,
                              void* user_data) {
  Highs* instance = static_cast<Highs*>(highs);
  if (!instance) return kHighsStatusError;
  if (!callback)
    return static_cast<HighsInt>(
        instance->setCallback(HighsCallbackFunctionType{}, nullptr));

  HighsCallbackFunctionType safe_callback =
      [callback](int type, const std::string& message,
                 const HighsCallbackOutput* data_out,
                 HighsCallbackInput* data_in, void* callback_user_data) {
        if (!data_out) return;
        HighsCallbackDataOut c_data_out =
            safe_callback_output(type, *data_out);
        HighsCallbackDataIn c_data_in{};
        HighsCallbackDataIn* c_data_in_pointer = nullptr;
        if (data_in) {
          c_data_in = static_cast<HighsCallbackDataIn>(*data_in);
          c_data_in_pointer = &c_data_in;
        }
        callback(type, message.c_str(), &c_data_out, c_data_in_pointer,
                 callback_user_data);
        if (data_in) *data_in = c_data_in;
      };
  return static_cast<HighsInt>(
      instance->setCallback(safe_callback, user_data));
}

}  // extern "C"
