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

}  // extern "C"
